#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 source/_data/music-tracks.yml 里的曲目对应的网易云歌词抓下来，写成
source/_data/music-lyrics.yml（供播放器的歌词区使用）。

为什么要在构建期抓、而不是浏览器里现拉：
  网易云的歌词接口没有 CORS 头（Content-Type: text/plain，没有
  Access-Control-Allow-Origin，也不支持 callback= 的 JSONP 包装），
  站内页面直接 fetch 会被浏览器拦掉。所以改成「构建期抓一次 → 存成数据文件 →
  构建时输出成 /js/xp-lyrics.json → 播放器点播放时 fetch 同源 JSON」。
  好处：访客不直接连网易云、没有跨域、没有额外第三方依赖；坏处：歌词要手动更新。

用法（注意是 py -3，不是 python；本机 python 是系统商店的占位程序）：
  py -3 tools/fetch/fetch-lyrics.py                    # 抓缺的 + 刷新全部
  py -3 tools/fetch/fetch-lyrics.py --missing-only     # 只补还没抓到的
  py -3 tools/fetch/fetch-lyrics.py --proxy http://127.0.0.1:7897

本脚本**只写 source/_data/music-lyrics.yml**，不会改动 music-tracks.yml。
纯音乐 / 版权受限的曲目抓不到歌词是正常的，脚本会列出来。
"""
import argparse
import datetime
import json
import os
import re
import sys
import time
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRACKS_YML = os.path.join(ROOT, "source", "_data", "music-tracks.yml")
OUT_YML = os.path.join(ROOT, "source", "_data", "music-lyrics.yml")
API_LYRIC = "https://music.163.com/api/song/lyric?id=%s&lv=1&kv=1&tv=-1"
HEADERS = {
    "Referer": "https://music.163.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
}


def open_url(url, proxy=None, timeout=20):
    handlers = [urllib.request.ProxyHandler(
        {"http": proxy, "https": proxy} if proxy else {})]
    opener = urllib.request.build_opener(*handlers)
    return opener.open(urllib.request.Request(url, headers=HEADERS), timeout=timeout)


def fetch_json(url, proxy=None):
    return json.loads(open_url(url, proxy=proxy).read().decode("utf-8", "replace"))


def yaml_str(v):
    """JSON 转义恰好是合法的 YAML 双引号字符串（歌词里全是换行/冒号/引号）。"""
    return json.dumps("" if v is None else str(v), ensure_ascii=False)


def read_tracks(path):
    """从 music-tracks.yml 里取出 [(id, title)]，只做够用的行解析，不引入 yaml 依赖。"""
    out = []
    if not os.path.exists(path):
        return out
    title, sid = "", ""
    for line in open(path, encoding="utf-8"):
        m = re.match(r"\s*- title:\s*(.*?)\s*$", line)
        if m:
            if sid:
                out.append((sid, title))
            title, sid = json.loads(m.group(1)), ""
            continue
        m = re.match(r"\s*url:\s*(.*?)\s*$", line)
        if m:
            hit = re.search(r"id=(\d+)", json.loads(m.group(1)))
            if hit:
                sid = hit.group(1)
    if sid:
        out.append((sid, title))
    return out


def read_previous(path):
    """读回上次生成的结果：({ id: lrc }, { id: tlrc })。

    用途有三个：--missing-only 跳过已抓到的；这次抓失败时沿用上次的好数据；
    翻译（tlrc）是后来才加的字段，老文件里没有，读不到就是空串。
    """
    prev, prev_tl = {}, {}
    if not os.path.exists(path):
        return prev, prev_tl
    text = open(path, encoding="utf-8").read()
    for block in re.split(r"\n  - id:", text)[1:]:
        hid = re.search(r'\s*(.*?)\s*\n', block)
        if not hid:
            continue
        try:
            cur_id = json.loads(hid.group(1))
        except ValueError:
            continue
        for field, store in (("lrc", prev), ("tlrc", prev_tl)):
            m = re.search(r"\n    %s:\s*(.*)" % field, block)
            if not m:
                continue
            try:
                store[cur_id] = json.loads(m.group(1))
            except ValueError:
                pass
    return prev, prev_tl


def clean_lrc(text):
    """只保留带时间轴的正文行；[ti:] [ar:] [by:] 这类头部信息扔掉（播放器用不到）。"""
    keep = []
    for line in (text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        if not re.match(r"^\[\d+:\d+", line):
            continue          # 头部元信息 / 纯说明文字
        body = re.sub(r"^(\[\d+:\d+(?:\.\d+)?\])+", "", line).strip()
        if not body:
            continue          # 纯时间轴的空行（间奏），保留会挤掉真歌词
        keep.append(line)
    return "\n".join(keep)


def clean_translation(text):
    """翻译歌词（tlyric）：同 clean_lrc，但网易云会在没有翻译的行上塞纯时间轴的
    空行占位 —— 那些必须扔掉，否则播放器会以为「这一句有翻译」而把行高翻倍。"""
    return clean_lrc(text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--proxy", default=None, help="例如 http://127.0.0.1:7897；默认直连")
    ap.add_argument("--missing-only", action="store_true", help="只抓上次没抓到的")
    ap.add_argument("--sleep", type=float, default=0.35, help="每首之间的间隔秒数（默认 0.35）")
    args = ap.parse_args()

    tracks = read_tracks(TRACKS_YML)
    if not tracks:
        raise SystemExit("没读到曲目：请先运行 py -3 tools/fetch/fetch-netease.py 生成 music-tracks.yml")

    prev, prev_tl = read_previous(OUT_YML)
    rows, no_lyric, reused = [], [], 0
    for idx, (sid, title) in enumerate(tracks, 1):
        if args.missing_only and prev.get(sid):
            rows.append((sid, title, prev[sid], prev_tl.get(sid, "")))
            continue
        lrc = ""
        tlrc = ""
        try:
            d = fetch_json(API_LYRIC % sid, args.proxy)
            lrc = clean_lrc(((d.get("lrc") or {}).get("lyric") or ""))
            tlrc = clean_translation(((d.get("tlyric") or {}).get("lyric") or ""))
        except Exception as e:
            print("  ! %s（%s）抓取失败：%s" % (title, sid, e))
        if not lrc:
            if prev.get(sid):
                lrc, reused = prev[sid], reused + 1     # 这次没抓到，别把上次的好数据抹掉
            else:
                no_lyric.append(title)
        if lrc and not tlrc:
            tlrc = prev_tl.get(sid, "")                 # 翻译抓丢了就沿用上次的
        rows.append((sid, title, lrc, tlrc))
        mark = "√" if lrc else "×"
        if lrc and tlrc:
            mark = "√译"
        print("  [%2d/%d] %s %s" % (idx, len(tracks), mark, title))
        time.sleep(args.sleep)

    lines = [
        "# 本文件由 tools/fetch/fetch-lyrics.py 自动生成，请不要手工编辑。",
        "# 来源歌单：source/_data/music-tracks.yml 里的曲目",
        "# 生成时间：%s" % datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "# 重新生成：py -3 tools/fetch/fetch-lyrics.py",
        "lyrics:",
    ]
    for sid, title, lrc, tlrc in rows:
        if not lrc:
            continue
        lines.append("  - id: %s" % yaml_str(sid))
        lines.append("    title: %s" % yaml_str(title))
        lines.append("    lrc: %s" % yaml_str(lrc))
        if tlrc:
            lines.append("    tlrc: %s" % yaml_str(tlrc))
    if not any(r[2] for r in rows):
        lines.append("  []")
    open(OUT_YML, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

    got = sum(1 for r in rows if r[2])
    chars = sum(len(r[2]) for r in rows)
    trans = sum(1 for r in rows if r[3])
    print("已写入 %d/%d 首歌词到 source/_data/music-lyrics.yml（共 %d 字符）"
          % (got, len(rows), chars))
    if trans:
        print("  其中 %d 首带翻译（tlrc），播放器会按需显示译文" % trans)
    if reused:
        print("  其中 %d 首这次没抓到，沿用上次结果" % reused)
    if no_lyric:
        print("  没有歌词（纯音乐 / 版权受限，播放器会退化成大封面）：%s"
              % "、".join(no_lyric[:12]))
    print("下一步：双击「1 开始使用.cmd」，按 2 看效果（必须带 clean，否则歌词文件不生效）")


if __name__ == "__main__":
    main()
