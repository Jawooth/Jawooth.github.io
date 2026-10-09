#!/usr/bin/env python3
"""站点核验脚本 —— 每次改完跑一遍，确认没有把站改坏。

用法（在仓库根目录）：
    python tools/verify-site.py
或使用本机可用的 Python 解释器。

检查项：
    1. 是否有未渲染的模板标签（{% xp_xxx %} 原样输出到页面里）
    2. 站内链接是否有 404（自动做 URL 解码，中文字符也能正确判断）
    3. 结构抽查：首页数据/作品卡片、桌面式页面不得出现文章结构、
       文章页必须有 XP 窗口外壳与标题栏、杂谈页必须有待办窗口
    4. 资源体积：图片总量、单页 HTML / 内联 CSS / 内联 JS 大小
    5. 是否残留外部依赖（picsum 图床、未使用的 XP.css CDN、未使用的字体）

退出码：0 = 全部通过；1 = 有失败项（便于以后接自动化）。
"""
import glob
import json
import os
import re
import sys
import urllib.parse

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")

if not os.path.isdir(PUB):
    print("× 找不到 public/，请先执行：npx hexo clean && npx hexo generate")
    sys.exit(1)

failures = []
warnings = []


def fail(msg):
    failures.append(msg)


def warn(msg):
    warnings.append(msg)


pages = sorted(glob.glob(os.path.join(PUB, "**", "*.html"), recursive=True))
print("站点根目录：%s" % ROOT)
print("生成页面数：%d\n" % len(pages))

# ---------------------------------------------------------------- 1/2/5 逐页扫描
BAD_TAGS = ["{%", "{{", "xp_num", "xp_recent", "xp_tag_cloud", "xp_todo",
            "xp_apps", "xp_guides", "xp_work", "xp_music", "xp_stat_rows"]
BAD_EXTERNAL = {
    "picsum.photos": "第三方随机图床（示例图应换成本地图片）",
    "unpkg.com/xp.css": "未使用的 XP.css CDN",
    "Press+Start+2P": "全站未使用的字体家族",
}

sizes = []
for f in pages:
    rel = os.path.relpath(f, PUB)
    s = open(f, encoding="utf-8", errors="replace").read()

    for pat in BAD_TAGS:
        if pat in s:
            fail("%s 里有未渲染的模板标签：%s" % (rel, pat))

    for pat, why in BAD_EXTERNAL.items():
        if pat in s:
            fail("%s 残留外部依赖：%s（%s）" % (rel, pat, why))

    styles = re.findall(r"<style[^>]*>(.*?)</style>", s, re.S)
    scripts = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", s, re.S)
    sizes.append((rel, len(s.encode()),
                  sum(len(x.encode()) for x in styles),
                  sum(len(x.encode()) for x in scripts)))

    for h in sorted(set(re.findall(r'(?:href|src)="(/[^"#?]*)"', s))):
        p = urllib.parse.unquote(h).lstrip("/")
        if h.endswith("/"):
            p += "index.html"
        if p and not os.path.exists(os.path.join(PUB, p.replace("/", os.sep))):
            fail("%s 里有断链：%s" % (rel, h))

# ---------------------------------------------------------------- 3 结构抽查
def read(rel):
    path = os.path.join(PUB, rel.replace("/", os.sep))
    return open(path, encoding="utf-8", errors="replace").read() if os.path.exists(path) else ""


home = read("index.html")
if "stat-row" not in home:
    fail("首页缺少「小站数据」统计行")
if "recent-work-thumb" not in home:
    fail("首页缺少最近作品缩略图")
if "site-search-form" not in home:
    fail("首页缺少站内搜索框")
if "top-box" in home:
    fail("首页混进了文章目录（TOC），说明页面模板回落到了 post.ejs")

for rel in ["works/index.html", "games/index.html", "guides/index.html",
            "todo/index.html", "about/index.html"]:
    s = read(rel)
    if not s:
        fail("缺少页面：%s" % rel)
        continue
    if 'class="post-detail"' in s or 'class="post-content"' in s:
        fail("%s 出现了文章结构，说明 layout 不是 xp-page" % rel)

posts = sorted(glob.glob(os.path.join(PUB, "20*", "*", "*", "*", "index.html")))
if not posts:
    warn("没有找到文章页，跳过文章页结构检查")
for f in posts:
    s = open(f, encoding="utf-8", errors="replace").read()
    rel = os.path.relpath(f, PUB)
    if "content-container xp-shell" not in s:
        fail("%s 缺少 XP 窗口外壳（xp-shell）" % rel)
    if "post-title-text" not in s:
        fail("%s 标题栏没有生成" % rel)
    if 'rel="canonical"' not in s:
        fail("%s 缺少 canonical" % rel)
    if "top-box" in s:
        fail("%s 混进了目录（TOC）" % rel)

blog = read("blog/index.html")
if "blog-todo-window" not in blog:
    fail("杂谈页没有注入待办窗口")

if not os.path.exists(os.path.join(PUB, "search.json")):
    fail("缺少 search.json（首页搜索会失效）")
else:
    try:
        data = json.load(open(os.path.join(PUB, "search.json"), encoding="utf-8"))
        if not data.get("posts"):
            warn("search.json 里没有文章")
    except Exception as exc:  # noqa: BLE001
        fail("search.json 解析失败：%s" % exc)

# ---------------------------------------------------------------- 4 体积
print("== 页面体积（HTML / 内联CSS / 内联JS 字节） ==")
for rel, total, css, js in sorted(sizes, key=lambda x: -x[1])[:6]:
    print("   %-42s %6d  css=%5d  js=%5d" % (rel, total, css, js))
    if css > 4096:
        warn("%s 内联 CSS 超过 4KB（组件样式应放进 xp-custom.css）" % rel)

imgs = []
for ext in ("*.jpg", "*.png", "*.webp"):
    for f in glob.glob(os.path.join(PUB, "**", ext), recursive=True):
        imgs.append((os.path.getsize(f), os.path.relpath(f, PUB)))
imgs.sort(reverse=True)
total_img = sum(s for s, _ in imgs)
print("\n== 图片（合计 %.2f MB） ==" % (total_img / 1048576.0))
for sz, rel in imgs[:6]:
    print("   %8.1f KB  %s" % (sz / 1024.0, rel))
if total_img > 1.5 * 1048576:
    warn("图片总量 %.2f MB 偏大（可用 tools/optimize-images.py 压缩）" % (total_img / 1048576.0))

# ---------------------------------------------------------------- 汇总
print("\n== 结果 ==")
if warnings:
    for w in warnings:
        print("   ! %s" % w)
if failures:
    for f in failures:
        print("   × %s" % f)
    print("\n未通过：%d 项失败，%d 项提醒" % (len(failures), len(warnings)))
    sys.exit(1)
print("   √ 全部通过（%d 项提醒）" % len(warnings))
