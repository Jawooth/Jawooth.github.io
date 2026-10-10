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
    "fonts.googleapis.com": "字体已自托管，不应再请求 Google Fonts（见 xp-custom.css 第 0 节）",
    "fonts.gstatic.com": "字体已自托管，不应再请求 Google Fonts",
    "cdn.jsdelivr.net": "APlayer 已自托管到 source/vendor/aplayer/，不应再请求 jsDelivr",
    "VT323": "全站未使用的像素字体",
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

    # 重复 id：页面上同一 id 出现两次时 getElementById 只会命中靠前的那个，
    # 另一个永远拿不到更新（2026-10 便签的 quote_left/quote_right 就是这么静默失效的）。
    # 先去掉注释，避免把注释里提到的 id 当成元素。
    strip = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    strip = re.sub(r"<script[\s\S]*?</script>", " ", strip)
    seen_ids = {}
    for m in re.finditer(r'\sid="([^"]+)"', strip):
        seen_ids[m.group(1)] = seen_ids.get(m.group(1), 0) + 1
    for dup, cnt in seen_ids.items():
        if cnt > 1:
            fail("%s 里有重复 id=%s（出现 %d 次，getElementById 只会命中第一个）" % (rel, dup, cnt))

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

for rel in ["works/index.html", "games/index.html", "guides/index.html"]:
    s = read(rel)
    if not s:
        fail("缺少页面：%s" % rel)
        continue
    if 'class="post-detail"' in s or 'class="post-content"' in s:
        fail("%s 出现了文章结构，说明 layout 不是 xp-page" % rel)

# /todo/ 页已按站主要求删除（待办清单只保留在杂谈页一处）
if os.path.exists(os.path.join(PUB, "todo", "index.html")):
    fail("待办页应当已删除，但仍存在 public/todo/index.html")
if 'href="/todo/"' in home:
    fail("首页仍有指向 /todo/ 的死链")

# 「关于」页已按站主要求删除，内容整合进首页的「关于本站」窗口
if os.path.exists(os.path.join(PUB, "about", "index.html")):
    fail("关于页应当已删除，但仍存在 public/about/index.html")
if 'id="about"' not in home:
    fail("首页缺少「关于本站」窗口（原关于页内容，锚点 id=about）")
if 'href="/about/"' in home:
    fail("首页仍有指向 /about/ 的死链")
if "friend-links" in home:
    fail("首页底部仍残留友情链接按钮（friend-links）")

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
        fail("%s 混进了主题自带目录（TOC）" % rel)
    if 'class="xp-aside"' not in s:
        fail("%s 缺少侧栏（xp-aside）" % rel)

blog = read("blog/index.html")
if "todo-mini-list" not in blog:
    fail("杂谈页缺少待办窗口")
if "xp-post-card" not in blog:
    fail("杂谈页没有渲染文章卡片流")
if 'class="xp-aside"' not in blog:
    fail("杂谈页缺少侧栏")

arc = read("archives/index.html")
if "xp-timeline-year" not in arc:
    fail("归档页没有渲染时间线")
if 'class="xp-aside"' not in arc:
    fail("归档页缺少侧栏")

for rel in ["tags/index.html", "categories/index.html"]:
    s = read(rel)
    if not s:
        fail("缺少索引页：%s" % rel)
    elif "xp-index-item" not in s:
        fail("%s 没有渲染索引条目" % rel)

# 作品页：画廊结构（栏目 / 时间轴 / 筛选 / 等大卡片 / 按需加载的正文）
works = read("works/index.html")
if not works:
    fail("缺少作品页 works/index.html")
else:
    if works.count('class="work-gallery"') != 1:
        fail("作品页画廊出现 %d 次（应为 1 次，多于 1 次通常是注释里写了标签）" % works.count('class="work-gallery"'))
    if 'class="work-tab' not in works:
        fail("作品页缺少「原创 / 同人」栏目切换")
    if 'class="work-era"' not in works:
        fail("作品页缺少时间轴分期")
    if "work-era\" open" not in works:
        fail("作品页没有任何默认展开的分期（最新一档应默认展开）")
    if 'class="filter-pill"' not in works:
        fail("作品页缺少标签筛选")
    if 'id="work-block-mode"' not in works:
        fail("作品页缺少屏蔽模式开关")
    if "data-work=" not in works:
        fail("作品卡片缺少正文定位标记（data-work）")
    if not os.path.exists(os.path.join(PUB, "works-bodies.json")):
        fail("缺少 works-bodies.json（作品「展开全文」的正文来源）")
    elif len(open(os.path.join(PUB, "works-bodies.json"), encoding="utf-8").read()) < 50:
        fail("works-bodies.json 内容为空")

# 首页：气泡 / 图标行 / 致谢
homes = read("index.html")
if "xp-bubble" not in homes:
    fail("首页缺少句子气泡（xp-bubble）")
if "profile-icon" not in homes:
    fail("首页缺少社交图标行（profile-icon）")
if "credits-list" not in homes:
    fail("首页底部缺少致谢条目（credits-list）")
if "sticky-note" in homes:
    fail("首页仍在使用旧便签样式（sticky-note）")

# 主题里那些从不加载的厂商资源（评论/放大/动画库等）应当已被删除，别再被带回产物里
DEAD_ASSETS = ["gitalk", "twikoo", "jquery.fancybox", "simple-lightbox",
               "jquery.min.js", "animate.min.css", "prism.css"]
for root_dir, _, files in os.walk(PUB):
    for name in files:
        for pat in DEAD_ASSETS:
            if pat in name:
                fail("产物里出现了未使用的厂商资源：%s（应已从主题删除，见 MAINTENANCE 第 13 节）"
                     % os.path.relpath(os.path.join(root_dir, name), PUB))

# 深色壁纸应当存在
if not os.path.exists(os.path.join(PUB, "images", "xp-desktop-bg-dark.jpg")):
    warn("缺少深色模式壁纸 images/xp-desktop-bg-dark.jpg（深色下会回退成纯色）")

# 有标题的文章应当生成目录
for f in posts:
    s = open(f, encoding="utf-8", errors="replace").read()
    if "<h2" in s and "xp-toc" not in s.replace("xp-toc-level", "").replace("xp-toc-item", ""):
        warn("%s 正文有二级标题但没有生成侧栏目录" % os.path.relpath(f, PUB))
        break

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
