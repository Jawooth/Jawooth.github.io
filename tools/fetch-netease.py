#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把网易云歌单转换成 source/_data/music-tracks.yml（供首页自带的 XP 播放器使用）。

为什么需要它：网易云的官方外链播放器只有「歌单列表」（约 430px 高、样式固定）
和「单曲条」两种形态，没有「封面 + 歌名 + 换歌 + 进度条」这种紧凑样式。
本站自带的 XP 播放器正好是这个外观，所以把歌单转成曲目列表最合适。

用法：
  1. 在 source/_data/music.yml 里把歌单 id 填到 netease_playlist（只要数字）
  2. 运行：
       python tools/fetch-netease.py
       python tools/fetch-netease.py --proxy http://127.0.0.1:7897   # 需要代理时
       python tools/fetch-netease.py --playlist 18472717518          # 直接指定歌单
       python tools/fetch-netease.py --no-verify                     # 不逐首测试（更快）
  3. 双击「构建小站」（或 npm run build）

本脚本**只写 source/_data/music-tracks.yml**，不会改动 music.yml。
能播放的是免费/可试听的歌；VIP、版权或地区受限的会自动跳过并列出。
"""
import argparse
import datetime
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC_YML = os.path.join(ROOT, "source", "_data", "music.yml")
OUT_YML = os.path.join(ROOT, "source", "_data", "music-tracks.yml")
API_DETAIL = "https://music.163.com/api/v6/playlist/detail?id=%s"
API_SONG = "https://music.163.com/api/song/detail?ids=[%s]"
STREAM = "https://music.163.com/song/media/outer/url?id=%s.mp3"
HEADERS = {
    "Referer": "https://music.163.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
}


def open_url(url, proxy=None, timeout=25, method="GET"):
    handlers = []
    handlers.append(urllib.request.ProxyHandler(
        {"http": proxy, "https": proxy} if proxy else {}))
    opener = urllib.request.build_opener(*handlers)
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    return opener.open(req, timeout=timeout)


def fetch_json(url, proxy):
    return json.loads(open_url(url, proxy=proxy).read().decode("utf-8", "replace"))


def audio_ok(url, proxy):
    try:
        resp = open_url(url, proxy=proxy, method="HEAD")
        ctype = (resp.headers.get("Content-Type") or "").lower()
        clen = int(resp.headers.get("Content-Length") or 0)
        if ("audio" in ctype or "octet-stream" in ctype) and clen > 50_000:
            return True
    except Exception:
        pass
    try:
        resp = open_url(url, proxy=proxy)
        ctype = (resp.headers.get("Content-Type") or "").lower()
        chunk = resp.read(2048)
        return ("audio" in ctype or "octet-stream" in ctype) and len(chunk) > 512
    except Exception:
        return False


def yaml_str(v):
    """JSON 转义恰好是合法的 YAML 双引号字符串，能安全处理冒号/引号/日文等"""
    return json.dumps("" if v is None else str(v), ensure_ascii=False)


def read_id_from(path):
    if not os.path.exists(path):
        return ""
    text = open(path, encoding="utf-8").read()
    m = re.search(r"^\s*netease_playlist\s*:\s*['\"]?([0-9]+)['\"]?", text, re.M)
    if m:
        return m.group(1)
    m = re.search(r"歌单\s*([0-9]{5,})", text)
    return m.group(1) if m else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--proxy", default=None, help="例如 http://127.0.0.1:7897；默认直连，失败自动试本机代理")
    ap.add_argument("--playlist", default=None, help="直接指定歌单 id（默认读 music.yml）")
    ap.add_argument("--no-verify", action="store_true", help="不逐首测试可播性")
    args = ap.parse_args()

    pid = args.playlist or read_id_from(MUSIC_YML) or read_id_from(OUT_YML)
    if not pid:
        raise SystemExit("没有歌单 id。请在 source/_data/music.yml 里把 id 填到 netease_playlist（只要数字）。")

    candidates = [args.proxy] if args.proxy else [None, "http://127.0.0.1:7897"]
    detail, used = None, None
    for p in candidates:
        try:
            detail = fetch_json(API_DETAIL % pid, p)
            used = p or "直连"
            break
        except Exception as e:
            print("  访问失败（%s）：%s" % (p or "直连", e))
    if detail is None:
        raise SystemExit("无法访问网易云接口，请检查网络，或用 --proxy 指定代理。")

    pl = detail.get("playlist") or {}
    tracks = pl.get("tracks") or []
    if not tracks:
        raise SystemExit("歌单里没有曲目，或歌单不是公开的（id=%s）。" % pid)
    print("歌单：%s（%s）共 %s 首" % (pl.get("name"), used, pl.get("trackCount")))

    # 未登录时接口只给前 10 首的完整信息，完整 id 列表在 trackIds 里，缺的用 song/detail 补齐
    all_ids = [t.get("id") for t in (pl.get("trackIds") or []) if t.get("id")]
    if not all_ids:
        all_ids = [t.get("id") for t in tracks if t.get("id")]
    meta = {t.get("id"): t for t in tracks if t.get("id")}
    missing = [i for i in all_ids if i not in meta]
    if missing:
        for i in range(0, len(missing), 50):
            chunk = missing[i:i + 50]
            try:
                d = fetch_json(API_SONG % ",".join(str(x) for x in chunk), args.proxy)
                got = d.get("songs") or []
                for t in got:
                    meta[t.get("id")] = t
                print("  补齐 %d 首曲目信息" % len(got))
            except Exception as e:
                print("  补齐曲目信息失败：%s" % e)
    ordered = [meta[i] for i in all_ids if i in meta] or tracks

    rows, skipped = [], []
    for t in ordered:
        sid = t.get("id")
        if not sid:
            continue
        url = STREAM % sid
        if not args.no_verify and not audio_ok(url, args.proxy):
            skipped.append(t.get("name"))
            continue
        rows.append({
            "title": t.get("name"),
            "author": " / ".join(a.get("name", "") for a in (t.get("ar") or [])),
            "album": (t.get("al") or {}).get("name", ""),
            "url": url,
            # 封面必须是 https：站点跑在 https 上，http 图片会被当成混合内容拦掉
            "pic": re.sub(r"^http://", "https://", (t.get("al") or {}).get("picUrl", "") or ""),
        })

    if not rows:
        raise SystemExit("所有曲目都测试失败（多为 VIP/版权/地区限制），没有可写的曲目。")

    lines = [
        "# 本文件由 tools/fetch-netease.py 自动生成，请不要手工编辑。",
        "# 来源歌单：%s（%s）" % (pl.get("name"), pid),
        "# 生成时间：%s" % datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "# 重新生成：python tools/fetch-netease.py",
        "tracks:",
    ]
    for r in rows:
        lines.append("  - title: %s" % yaml_str(r["title"]))
        lines.append("    author: %s" % yaml_str(r["author"]))
        if r["album"]:
            lines.append("    album: %s" % yaml_str(r["album"]))
        lines.append("    url: %s" % yaml_str(r["url"]))
        if r["pic"]:
            lines.append("    pic: %s" % yaml_str(r["pic"]))
    open(OUT_YML, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

    print("已写入 %d 首到 source/_data/music-tracks.yml" % len(rows))
    if skipped:
        print("跳过 %d 首（不可播，多为 VIP/版权/地区限制）：%s"
              % (len(skipped), "、".join(s or "?" for s in skipped)))
    print("下一步：双击「构建小站」（或 npm run build）")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
