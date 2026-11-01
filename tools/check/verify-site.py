#!/usr/bin/env python3
"""站点核验脚本 —— 每次改完跑一遍，确认没有把站改坏。

用法（在仓库根目录；注意是 py -3，本机 python 是系统商店的占位程序）：
    py -3 tools/check\verify-site.py

检查项：
    1. 是否有未渲染的模板标签（{% xp_xxx %} 原样输出到页面里）
    2. 站内链接是否有 404（自动做 URL 解码，中文字符也能正确判断）
    3. 结构抽查：首页数据/作品卡片、桌面式页面不得出现文章结构、
       文章页必须有 XP 窗口外壳与标题栏、杂谈页必须有待办窗口
    4. 资源体积：图片总量、单页 HTML / 内联 CSS / 内联 JS 大小
    5. 是否残留外部依赖（picsum 图床、XP.css CDN、未使用的字体）
    6. 站点用字 ∩ 正文字体覆盖（防将来字体子集化后掉字，见第 7 节）
    7. 依赖安全审计 npm audit（走官方源，只警告不失败；--no-audit 跳过）
    8. XP.css 自托管库：副本还在、@layer 包裹完好、每页都引上且顺序正确
       （少了 @layer 包裹会让全站 500+ 元素的字号/按钮尺寸/链接颜色一起变，详见第 8 节）
    9. 依赖安全审计 npm audit（--no-audit 跳过）
   10. 审美门禁：把 README 13.7 节「反规则清单」里标 ⭐ 的几条变成机器检查
       （圆角语义表 / 深色成对 / 禁用字体与渐变 / 组件样式不外泄）

退出码：0 = 全部通过；1 = 有失败项（便于以后接自动化）。
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
# 未渲染的模板标签：只认真正的标签起始符。
# 旧版这里还列了 "xp_num" 之类的裸标签名，结果页面上任何一处提到这些词
# （比如注释、文档、script 里的字符串）都会误报，所以改成匹配起始符本身。
BAD_TAG_RE = re.compile(r"\{%|\{\{")
BAD_EXTERNAL = {
    "picsum.photos": "第三方随机图床（示例图应换成本地图片）",
    # 这条以前写作「未使用的 XP.css CDN」。现在 XP.css **在用**了，但必须自托管
    # （source/vendor/xp-css/，版本钉死 0.3.0），所以这条的含义变成「别又改回 CDN」：
    # CDN 上的原文没有 @layer 包裹，直接引进来会把 body 字号打回 12px、把所有按钮
    # 撑到 75px 宽 —— 等于把 2026-10-13 那次兼容层改动全部作废。详细原因见第 8 节。
    "unpkg.com/xp.css": "XP.css 必须自托管（source/vendor/xp-css/），不要走 CDN",
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

    m = BAD_TAG_RE.search(s)
    if m:
        fail("%s 里有未渲染的模板标签：%s" % (rel, s[m.start():m.start() + 40].replace("\n", " ")))

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
if "stat-row" not in home and "meta-stat" not in home:
    # 2026-10 起「绘画/文章/杂谈/待办」四格统计并进了「用户账户」卡，
    # 类名从 stat-row 改成 meta-stat；只认旧类名会把正常页面判成失败。
    fail("首页缺少统计行（stat-row / meta-stat 都没有）")
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

# 文章页在产物里的位置由 `_config.yml` 的 permalink 规则决定。2026-10 起规则是
# `:title/`（不带日期），所以**不能再靠 `/年/月/日/` 这种形状去 glob** —— 那样会
# 一篇都找不到、然后静默跳过全部文章页检查（这本身就是一个典型的「静默失效」）。
# 改为从源文件反推：有 front matter `permalink:` 用它，否则用文件名。
posts_dir = os.path.join(ROOT, "source", "_posts")
POST_PATHS = []  # [(相对路径, 网址 key)]，下面的「网址撞车」检查也复用它
for f in sorted(glob.glob(os.path.join(posts_dir, "**", "*.md"), recursive=True)):
    src = open(f, encoding="utf-8", errors="replace").read()
    fm = re.match(r"^---\r?\n(.*?)\r?\n---", src, re.S)
    pm = re.search(r"^permalink:\s*(.+?)\s*$", fm.group(1) if fm else "", re.M)
    key = pm.group(1).strip().strip("'\"") if pm else os.path.splitext(os.path.basename(f))[0]
    POST_PATHS.append((os.path.relpath(f, ROOT), key.strip("/")))

posts = []
for _who, _key in POST_PATHS:
    p = os.path.join(PUB, _key.replace("/", os.sep), "index.html")
    if os.path.exists(p):
        posts.append(p)
    else:
        fail("文章 %s 的网址 /%s/ 在产物里找不到（permalink 写错了？）" % (_who, _key))
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

# 作品页：瀑布流画廊（栏目 / 筛选 / 卡片只含 封面/标题/简介/标签，点卡片直接进详情页）
# 2026-10-18 瀑布流改版：时间轴分期、data-work、works-bodies.json 已随「就地展开全文」下线。
works = read("works/index.html")
if not works:
    fail("缺少作品页 works/index.html")
else:
    if works.count('class="work-gallery"') != 1:
        fail("作品页画廊出现 %d 次（应为 1 次，多于 1 次通常是注释里写了标签）" % works.count('class="work-gallery"'))
    if 'class="work-tab' not in works:
        fail("作品页缺少「原创 / 同人」栏目切换")
    if 'class="filter-pill"' not in works:
        fail("作品页缺少标签筛选")
    if 'id="work-block-mode"' not in works:
        fail("作品页缺少屏蔽模式开关")
    if 'class="work-grid"' not in works:
        fail("作品页缺少瀑布流容器（work-grid）")
    if 'work-expand' in works or 'work-era' in works:
        fail("作品页残留旧版「展开全文 / 分期树」结构（应已下线）")
    if "work-card-desc" not in works:
        fail("作品卡片缺少简介（work-card-desc，来自 front-matter 的 desc:）")
    if "works-bodies.json" in works:
        fail("作品页还在引用 works-bodies.json（就地展开已下线，点击应直接进详情页）")

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
                fail("产物里出现了未使用的厂商资源：%s（应已从主题删除，见 README.md 第 10 节）"
                     % os.path.relpath(os.path.join(root_dir, name), PUB))

# 深色壁纸应当存在（2026-10-19 起壁纸用 webp）
if not os.path.exists(os.path.join(PUB, "images", "xp-desktop-bg-dark.webp")):
    warn("缺少深色模式壁纸 images/xp-desktop-bg-dark.webp（深色下会回退成纯色）")

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
        # 加密文章的正文不能进搜索索引（2026-10-22 安全审查）。
        # 索引是公开可下载的，而 hexo-blog-encrypt 渲染后 p.content 只剩密码框，
        # 生成器若不过滤，就会把 message 那句提示语（甚至插件将来的摘要）漏进去。
        # 这里按「加密文章标题 → 索引里该条的 text 必须为空」校验。
        locked_titles = set()
        for f in sorted(glob.glob(os.path.join(ROOT, "source", "_posts", "**", "*.md"), recursive=True)):
            head = open(f, encoding="utf-8", errors="replace").read(4096)
            m = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", head)
            if not m:
                continue
            fm = m.group(1)
            if not re.search(r"^password\s*:", fm, re.M):
                continue
            t = re.search(r"^title\s*:\s*(.+)$", fm, re.M)
            if t:
                locked_titles.add(t.group(1).strip().strip("\"'"))
        for item in data.get("posts") or []:
            if item.get("title") in locked_titles and (item.get("text") or "").strip():
                fail("加密文章《%s》的正文漏进了 search.json（索引是公开可下载的）" % item.get("title"))
    except Exception as exc:  # noqa: BLE001
        fail("search.json 解析失败：%s" % exc)

# ---------------------------------------------------------------- 3.5 文章源文件
# 「缩进 4 个空格 = 代码块」是 Markdown 最容易踩的坑：从别处**粘贴**正文时常常把
# 缩进一起带进来，结果整篇文章变成一块灰底等宽字（页面不报错，只是长得和示例文章
# 完全不一样，很难自己看出原因）。这里扫一遍源文件，把这类行挑出来提醒。
# 跳过：front matter、``` 围栏里的代码、<!-- --> 注释、缩进的下级列表项。
CJK_RE = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
INDENTED_RE = re.compile(r"^(?: {4,}|\t+)\S")
LIST_ITEM_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s")

posts_dir = os.path.join(ROOT, "source", "_posts")
for f in sorted(glob.glob(os.path.join(posts_dir, "**", "*.md"), recursive=True)):
    lines = open(f, encoding="utf-8", errors="replace").read().splitlines()
    in_fence = in_comment = in_front = in_html = False
    for n, line in enumerate(lines, 1):
        if n == 1 and line.strip() == "---":
            in_front = True
            continue
        if in_front:
            if line.strip() == "---":
                in_front = False
            continue
        if in_comment:
            if "-->" in line:
                in_comment = False
            continue
        if "<!--" in line:
            if "-->" not in line:
                in_comment = True
            continue
        if in_fence:
            if FENCE_RE.match(line):
                in_fence = False
            continue
        if FENCE_RE.match(line):
            in_fence = True
            continue
        # HTML 块（<div> 之类）会一直吃到空行为止，里面的缩进是排版，不是代码块
        if in_html:
            if not line.strip():
                in_html = False
            continue
        if line.lstrip().startswith("<"):
            in_html = True
            continue
        if INDENTED_RE.match(line) and not LIST_ITEM_RE.match(line) and CJK_RE.search(line):
            warn("%s 第 %d 行缩进了 4 个空格：Markdown 会把这行当成代码块，"
                 "正文会变成灰底等宽字（顶格写才对）：%s"
                 % (os.path.relpath(f, ROOT), n, line.strip()[:28]))
            break

# ---------------------------------------------------------------- 3.6 网址撞车
# 2026-10 起 permalink 规则改成「不带日期」（`:title/`），网址就是 `/文件名/`。
# 代价是**撞车的可能性变大了**：两篇同名、或者拿 `blog` / `works` 这种已有页面名当
# 文件名，就会互相顶掉 —— 而且 Hexo 不报错，后生成的静默覆盖先生成的。
# 这里按「网址的第一段」提前查重（有显式 permalink 的按 permalink 算）。
RESERVED_TOP = {"archives", "blog", "categories", "css", "fonts", "games", "guides",
                "images", "js", "page", "style", "tags", "vendor", "works"}
path_names = {}
for who, key in POST_PATHS:
    top = key.split("/")[0]
    if top in RESERVED_TOP:
        fail("%s 的网址顶层是 `%s`，和站内已有页面撞名（会把那个页面顶掉）" % (who, top))
    if key in path_names:
        fail("%s 和 %s 的网址都是 `/%s/`，两篇会互相顶掉" % (who, path_names[key], key))
    path_names[key] = who

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
    warn("图片总量 %.2f MB 偏大（可用 tools/images/optimize-images.py 压缩）" % (total_img / 1048576.0))

# ---------------------------------------------------------------- 6 静默失效三查
# 下面这些问题都不会让构建报错，只会在页面上「悄悄少一块」，
# 所以必须由脚本盯住（2026-10 审计一次就发现三类）。

# 6.1 <use href="#x"> 必须有对应的 <symbol id="x">
#     SVG 的 <use> 找不到目标时不会报错，只是什么都不画。
#     每个页面各自带一份 <defs>，所以按页检查。
for f in pages:
    rel = os.path.relpath(f, PUB)
    s = open(f, encoding="utf-8", errors="replace").read()
    syms = set(re.findall(r'<symbol[^>]*\bid="([^"]+)"', s))
    used = set(re.findall(r'<use[^>]*\bhref="#([^"]+)"', s))
    for name in sorted(used - syms):
        fail('%s 引用了不存在的图标 <use href="#%s">（页面上不会画出任何东西）' % (rel, name))

# 6.2 CSS 里 url('/...') 指向的文件必须真的存在
#     背景图缺失同样不报错，只是没有背景。
#     /images/decor/ 下两张是可选的（CSS 注释写明「不想要就留空」），所以列白名单。
OPTIONAL_ASSETS = {"/images/decor/left.png", "/images/decor/right.png"}
for f in glob.glob(os.path.join(ROOT, "source", "css", "**", "*.css"), recursive=True):
    s = open(f, encoding="utf-8", errors="replace").read()
    rel = os.path.relpath(f, ROOT)
    for u in sorted(set(re.findall(r"url\(\s*['\"]?(/[^'\")]+)['\"]?\s*\)", s))):
        if u in OPTIONAL_ASSETS:
            continue
        tgt = urllib.parse.unquote(u).lstrip("/").replace("/", os.sep)
        if not os.path.exists(os.path.join(PUB, tgt)):
            fail("%s 里的 url(%s) 指向不存在的文件" % (rel, u))

# 6.3 数据文件必须是合法 YAML（写错一个缩进，整块数据会静默变空）
try:
    import yaml as _yaml

    for f in sorted(glob.glob(os.path.join(ROOT, "source", "_data", "*.yml"))):
        try:
            _yaml.safe_load(open(f, encoding="utf-8").read())
        except Exception as exc:  # noqa: BLE001
            fail("数据文件 %s 不是合法 YAML：%s" % (os.path.relpath(f, ROOT), exc))

    _music = _yaml.safe_load(open(os.path.join(ROOT, "source", "_data", "music.yml"), encoding="utf-8").read()) or {}
    if os.path.exists(os.path.join(ROOT, "source", "_data", "music-tracks.yml")) and not (_music.get("tracks") or []):
        warn("music.yml 的 tracks 是空的，播放器实际用的是自动生成的 music-tracks.yml"
             "（tools/fetch/fetch-netease.py 写入）；想手填曲目就改 music.yml 的 tracks")

    # 6.4 导航菜单每项都要有 url 和 name，且站内 url 必须能打开
    _menu_cfg = os.path.join(ROOT, "_config.minimalism.yml")
    if os.path.exists(_menu_cfg):
        _cfg = _yaml.safe_load(open(_menu_cfg, encoding="utf-8").read()) or {}
        for key, item in (_cfg.get("menu") or {}).items():
            if not isinstance(item, dict):
                fail("_config.minimalism.yml 的 menu.%s 写错了：应当有 url 和 name 两行" % key)
                continue
            for field in ("url", "name"):
                if not item.get(field):
                    fail("_config.minimalism.yml 的 menu.%s 缺少 %s" % (key, field))
            u = str(item.get("url") or "")
            if u.startswith("/") and not item.get("External"):
                p = urllib.parse.unquote(u).lstrip("/")
                if u.endswith("/"):
                    p += "index.html"
                if p and not os.path.exists(os.path.join(PUB, p.replace("/", os.sep))):
                    fail("导航菜单 menu.%s 指向的页面不存在：%s" % (key, u))
except ImportError:
    warn("没装 PyYAML，跳过数据文件与菜单校验（py -3 -m pip install PyYAML）")

# 6.5 文档链接必须指向真实存在的文件（改文档时最容易留死链）
#     根目录的 *.md 与 tools/ 下的 *.md 都查（README 第 13 节 是给 AI 看的一页纸约束）
_doc_link_targets = sorted(glob.glob(os.path.join(ROOT, "*.md")))
_doc_link_targets += sorted(glob.glob(os.path.join(ROOT, "tools", "**", "*.md"), recursive=True))
for doc in _doc_link_targets:
    dtxt = open(doc, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r"\]\((?!https?:|#|mailto:)([^)]+)\)", dtxt):
        target = m.group(1).split("#")[0].strip()
        if target and not os.path.exists(os.path.join(ROOT, target.replace("/", os.sep))):
            fail("%s 里的链接指向不存在的文件：%s"
                 % (os.path.relpath(doc, ROOT), m.group(1)))

# 6.6 文档与注释别再教「已经删掉的东西」。
#     2026-10 整理时，6 个 .cmd + deploy.ps1 + tools\backup.ps1 合并成了一个入口
#     （1 开始使用.cmd + tools\hexo-ui.ps1）。这里只提醒、不判失败：
#     文档里可能是在讲「以前是什么样」的历史说明，机器分不清历史与指令。
#     扫描范围包含 source/_data/*.yml 与 tools/*.py —— 本轮就曾在
#     music.yml / works.yml / fetch-netease.py 的注释里留下过时的启动器名。
STALE_IN_DOCS = {
    "重新生成.cmd": "已合并进「1 开始使用.cmd」的菜单 [2]",
    "看效果.cmd": "已合并进菜单 [2]",
    "发布上线.cmd": "已合并进菜单 [3]",
    "更新歌单.cmd": "已合并进菜单 [6]",
    "写文章打开 HexoHub.cmd": "已合并进菜单 [1]",
    "先备份.cmd": "已合并进菜单 [4]",
    "deploy.ps1": "逻辑已并入 tools\\hexo-ui.ps1",
    "backup.ps1": "逻辑已并入 tools\\hexo-ui.ps1",
    "WORK_ERAS": "作品分期已改到 source/_data/works.yml",
    "WORK_ORIGINS": "作品栏目已改到 source/_data/works.yml",
    "python tools": "本机 python 是商店占位程序，要用 py -3",
}
_doc_targets = sorted(glob.glob(os.path.join(ROOT, "*.md")))
_doc_targets += sorted(glob.glob(os.path.join(ROOT, "source", "_data", "*.yml")))
_doc_targets += sorted(glob.glob(os.path.join(ROOT, "tools", "**", "*.py"), recursive=True))
for doc in _doc_targets:
    # verify-site.py 自己就写着这些名字（就是下面这张表），跳过
    if os.path.basename(doc) == "verify-site.py":
        continue
    dtxt = open(doc, encoding="utf-8", errors="replace").read()
    for pat, why in STALE_IN_DOCS.items():
        if pat in dtxt:
            warn("%s 里提到「%s」（%s）—— 若是在教用户这么做，请改掉"
                 % (os.path.relpath(doc, ROOT), pat, why))

# ---------------------------------------------------------------- 7 用字 ∩ 字体覆盖
# 正文字体（fusion-pixel-12px-proportional-zh_hans.woff2）目前是全量文件，
# 但如果哪天按 README 第 10 节的计划用 cn-font-split 做子集化，新文章里出现
# 字体未收录的字符就会**静默**回退成系统字体（Microsoft YaHei），像素风破功
# 而且构建不报错。这里提前把「站点实际用字 ∩ 字体 cmap」算一遍：
# 缺字时提醒重裁字体，让「子集化省钱」和「不掉字」两边好处都拿到。
# 只查正文主字体：粗体早已是裁过的子集，粗体掉字回退系统粗体是可接受取舍。
# emoji / 箭头等符号按设计就走系统字体，不在检查范围。
FONT_MAIN = os.path.join(ROOT, "source", "fonts",
                        "fusion-pixel-12px-proportional-zh_hans.woff2")
# CJK 统一表意文字 + 扩展 A + 兼容表意 +  CJK 符号/标点/全角形式
COVER_RE = re.compile(
    "[\u2e80-\u2eff\u3000-\u303f\u3190-\u319f\u31f0-\u31ff"
    "\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]"
)
_text_files = sorted(glob.glob(os.path.join(ROOT, "source", "_posts", "**", "*.md"), recursive=True))
_text_files += sorted(glob.glob(os.path.join(ROOT, "source", "**", "*.md"), recursive=True))
_text_files += sorted(glob.glob(os.path.join(ROOT, "source", "_data", "*.yml")))
# CSS/JS 里的符号也会用正文字体渲染（例如恢复 chip 的 ▣、时间线的 ▸），
# 扫描范围与 tools/fonts/make-pixel-fonts.py 的 repo_chars() 保持一致
for _ext in ("css", "js", "ejs", "styl"):
    _text_files += sorted(glob.glob(os.path.join(ROOT, "source", "**", "*.%s" % _ext), recursive=True))
    _text_files += sorted(glob.glob(os.path.join(ROOT, "themes", "**", "*.%s" % _ext), recursive=True))
    _text_files += sorted(glob.glob(os.path.join(ROOT, "scripts", "*.%s" % _ext), recursive=True))
used_chars = set()
for f in _text_files:
    try:
        used_chars.update(COVER_RE.findall(
            open(f, encoding="utf-8", errors="replace").read()))
    except OSError:
        pass
print("\n== 用字 ∩ 正文字体覆盖（%d 个汉字/全角字符） ==" % len(used_chars))
try:
    from fontTools.ttLib import TTFont  # noqa: PLC0415

    if not os.path.exists(FONT_MAIN):
        warn("找不到正文字体 %s，跳过覆盖检查" % os.path.relpath(FONT_MAIN, ROOT))
    else:
        cmap = TTFont(FONT_MAIN).getBestCmap()
        missing = sorted(ch for ch in used_chars if ord(ch) not in cmap)
        if missing:
            warn("正文字体缺 %d 个字（会回退系统字体，像素风破功）：%s%s"
                 "—— 重跑 py -3 tools\\fonts\\make-pixel-fonts.py 重新裁剪；"
                 "若全量原件也没有这个字（如「嬷」），只能换字体或接受单字回退"
                 % (len(missing), "".join(missing[:30]),
                    "…" if len(missing) > 30 else ""))
        else:
            print("   √ 站点用字全部在正文字体覆盖范围内")
except ImportError:
    warn("没装 fonttools+brotli（py -3 -m pip install fonttools brotli），"
         "跳过「用字 ∩ 字体覆盖」检查")

# ---------------------------------------------------------------- 8 XP.css 自托管库
# 2026-10-13 起全站引入 XP.css（自托管、版本钉死 0.3.0）。这里守住四件事，
# 每一件破了都会造成大范围回归或对外请求，所以都直接判失败、不是提醒：
#   ① 副本还在；
#   ② 副本仍被 @layer xp-css 包着 —— 少了这层包裹，XP.css 的元素选择器
#      （body{font-size:12px} / button{min-width:75px;min-height:23px} /
#        a{color:#00f} / h1..h4{font-size:Nrem} / pre,pre *{字体}）
#      会直接压过全站样式：实测每页 500+ 个元素的字号、所有按钮的尺寸与内边距、
#      链接颜色、代码块字体会一起变。有了这层包裹，分层样式一律输给未分层样式，
#      库只在「本站没写过的地方」生效。
#   ③ LICENSE 还在（MIT 要求随分发附带）；
#   ④ **每一个**生成的 HTML 页面都引到了它，且顺序是
#      style/main.css → XP.css → xp-custom.css（顺序反了兼容层就压不住库）。
print("\n== XP.css 自托管库（source/vendor/xp-css/） ==")
XP_DIR = os.path.join(ROOT, "source", "vendor", "xp-css")
XP_SRC = os.path.join(XP_DIR, "XP.css")
if not os.path.exists(XP_SRC):
    fail("缺少 source/vendor/xp-css/XP.css（XP.css 自托管副本）—— 全站会少一整层样式")
else:
    xp_txt = open(XP_SRC, encoding="utf-8", errors="replace").read()
    if "@layer xp-css" not in xp_txt:
        fail("source/vendor/xp-css/XP.css 里的 @layer xp-css 包裹不见了 —— "
             "XP.css 会压过全站样式，每页 500+ 个元素的字号/按钮尺寸/链接颜色会一起变，"
             "详见本文件第 8 节的注释")
    # 只匹配真正的 sourcemap 指令（形如 /*# sourceMappingURL=XP.css.map */）。
    # 不能只搜裸的 "sourceMappingURL" —— 文件开头的说明注释里就提到了这个词，
    # 那样会自己给自己报一个假失败（2026-10-13 第一次跑就踩到了）。
    m = re.search(r"sourceMappingURL\s*=", xp_txt)
    if m:
        fail("source/vendor/xp-css/XP.css 仍有 sourcemap 指令（%s…）—— 站点不发布 sourcemap，"
             "访客每次都会白吃一个 404 请求" % xp_txt[m.start():m.start() + 40])
if not os.path.exists(os.path.join(XP_DIR, "LICENSE")):
    fail("缺少 source/vendor/xp-css/LICENSE —— MIT 要求随分发附带许可证原件")

# 跳转页豁免：/guides/ 及其分页在 2026-10-18「文章」并入「文字」后不再有列表内容，
# 只剩一张静态跳转页（meta refresh → /blog/）。它故意不带任何样式表 ——
# 带了的坏处是：跳转页只存在几百毫秒，加载 3 个 CSS 纯属浪费访客流量。
# 识别方式取两个条件同时成立，避免把真正漏了 XP.css 的页面也放过：
#   ① head 里有 <meta http-equiv="refresh">（就是这个用途的页面）
#   ② 一个 <link rel="stylesheet"> 都没有（真要渲染内容的页面不可能这样）
def _is_redirect_stub(html):
    head = html.split("</head>", 1)[0].lower()
    if 'http-equiv="refresh"' not in head and "http-equiv='refresh'" not in head:
        return False
    return 'rel="stylesheet"' not in head and "rel='stylesheet'" not in head


no_xp, bad_order, redirects = [], [], []
for f in pages:
    rel = os.path.relpath(f, PUB)
    s = open(f, encoding="utf-8", errors="replace").read()
    i_xp = s.find("/vendor/xp-css/XP.css")
    if i_xp < 0:
        if _is_redirect_stub(s):
            redirects.append(rel)
            continue
        no_xp.append(rel)
        continue
    i_main = s.find("style/main.css")
    i_custom = s.find("css/xp-custom.css")
    if not (0 <= i_main < i_xp < i_custom):
        bad_order.append(rel)
if no_xp:
    fail("%d 个页面没有引入 XP.css：%s%s（应为 head 里由 scripts/inject-xp-css.js 统一注入）"
         % (len(no_xp), "、".join(no_xp[:4]), " …" if len(no_xp) > 4 else ""))
if bad_order:
    fail("%d 个页面的样式表顺序不对（应为 main.css → XP.css → xp-custom.css）：%s%s"
         % (len(bad_order), "、".join(bad_order[:4]), " …" if len(bad_order) > 4 else ""))
if redirects:
    print("   √ %d 个跳转页不带样式表（meta refresh + 无 stylesheet，符合预期）：%s"
          % (len(redirects), "、".join(redirects[:3]) + (" …" if len(redirects) > 3 else "")))
if not no_xp and not bad_order and os.path.exists(XP_SRC):
    print("   √ %d 个页面全部已引入，顺序正确（main.css → XP.css → xp-custom.css），"
          "@layer 包裹与 LICENSE 完好" % len(pages))

# ---------------------------------------------------------------- 9 依赖安全审计
# npmmirror 的 audit 端点是 404，「没有漏洞」会是假象 —— 必须显式走官方源。
# 这些顾问都是**构建期本地**的传递依赖风险（glob DoS 之类）；GitHub Pages
# 只服务静态文件，访客面不受影响，所以这里只提醒、不判失败。
# 用法：verify-site.py --no-audit 可跳过（离线环境）。
if "--no-audit" in sys.argv:
    print("\n== 依赖审计（--no-audit，已跳过） ==")
else:
    print("\n== 依赖安全审计（npm audit，官方源） ==")
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        warn("找不到 npm，跳过依赖审计")
    else:
        try:
            proc = subprocess.run(
                [npm, "audit", "--registry=https://registry.npmjs.org"],
                cwd=ROOT, capture_output=True, text=True, timeout=180,
            )
            m = re.search(r"(\d+)\s+vulnerabilit", (proc.stdout or "") + (proc.stderr or ""))
            if not m:
                # 取第一条像样的错误行（npm 最后那行永远是日志路径，没信息量）
                err_lines = [ln for ln in (proc.stderr or "").splitlines()
                             if ln.strip() and "A complete log" not in ln]
                detail = err_lines[-1].strip() if err_lines else (proc.stdout or "").strip()[-80:]
                hint = ""
                if re.search(r"ECONNRESET|ETIMEDOUT|ENOTFOUND|EPROTO|proxy", detail, re.I):
                    hint = "（像是代理问题：README 0.1 节记过 Clash 对 registry.npmjs.org 的 TLS 失败，换节点或直连重试）"
                warn("npm audit 没跑起来：%s %s" % (detail[:120], hint))
            elif int(m.group(1)) == 0:
                print("   √ 0 个已知漏洞")
            else:
                warn("npm audit 报告 %s 个漏洞（详见上方输出）。"
                     "本站威胁模型下均为构建期本地风险，访客面不受影响；"
                     "升级请遵守 package.json 注释里的「一次只升一个包」" % m.group(1))
        except subprocess.TimeoutExpired:
            warn("npm audit 超时（180s），跳过本次审计")

# ---------------------------------------------------------------- 10 审美门禁
# README 第 13 节 把视觉约束写成了给人和 AI 看的一页纸。但文档靠自觉 ——
# 这份检查把其中**最容易在无意中被写回去**的几条变成机器拦截（源自 Patina 的
# /check-y2k 思路：把审美规则做成构建门禁，而不是只写在文档里）。
#
# 设计原则（重要，决定每条是 fail 还是 warn）：
#   * 只拦「一定是错的」→ fail。判不准的一律 warn，宁可漏报不可误报，
#     否则门禁会被「反正总在报错」而整体绕开，比没有更糟。
#   * 不做「全量规则扫描」那种大而全的东西 —— 只查真正踩过的坑。
print("\n== 审美门禁（README 13.7 节反规则清单的可检查部分） ==")
CSS_MAIN = os.path.join(ROOT, "source", "css", "xp-custom.css")
gate_passed, gate_notes = [], []

if not os.path.exists(CSS_MAIN):
    fail("缺少 source/css/xp-custom.css（本站设计系统的唯一真源）")
else:
    css = open(CSS_MAIN, encoding="utf-8", errors="replace").read()
    css_lines = css.splitlines()

    # --- 10.1 圆角：只允许 DESIGN.md 5.2 列表里的值 -----------------------
    # 白名单而不是「超过 N 种就报警」：5.2 那张表已经把每个值对应到语义，
    # 出现表外的值就意味着有人随手写了一个数字。已知的 5 个历史遗留
    # （11px/9px 那批小文字块）在表里列了名字、这里也一并放行。
    ALLOWED_RADIUS = {
        "0", "2px", "3px", "4px", "50%",
        "8px 8px 0 0", "6px 6px 0 0", "0 10px 10px 0",
        "6px", "8px", "9px", "11px", "12px",
        # 6/8/12px 是 2026-10 跑这道门禁时才补进 5.2 的：
        #   6px  .xp-firework-text（烟花文字浮标）、.xp-aside-author img（头像方块）
        #   8px  .profile-email-pop .email-label（弹窗小标签）
        #   12px .meta-chip（文章信息条的小胶囊徽标）
        # 9px/11px 是 5.2 记在案的历史遗留（.work-tag/.work-cat/.filter-pill）。
    }
    # 只取声明行，跳过注释里的说明文字（否则 5.2 表格抄进注释就自报假错）
    radius_re = re.compile(r"border-radius\s*:\s*([^;/}]+)")
    bad_radius = {}
    for i, ln in enumerate(css_lines, 1):
        code = ln.split("/*")[0]
        if code.strip().startswith("*") or code.strip().startswith("//"):
            continue
        for m in radius_re.finditer(code):
            val = " ".join(m.group(1).split())
            if val and val not in ALLOWED_RADIUS:
                bad_radius.setdefault(val, []).append(i)
    if bad_radius:
        detail = "；".join("%s（L%s）" % (v, ",".join(str(x) for x in ls[:3]))
                          for v, ls in sorted(bad_radius.items()))
        warn("xp-custom.css 出现 DESIGN.md 5.2 圆角表之外的值：%s —— "
             "要么改回表里的值（3px 是默认），要么先把它加进 5.2 并写明用在哪" % detail)
        gate_notes.append("圆角有 %d 种表外值" % len(bad_radius))
    else:
        gate_passed.append("圆角全部落在 5.2 语义表内")

    # --- 10.2 深色模式成对：:root 定义的「颜色类」变量须在 html.dark 有对应 ---
    # 本站出错最多的地方。只查 :root 第一个块里的变量，且**排除**两类：
    #   ① 按设计就不需要深色版的（DESIGN.md 第 3 节明确写「只改一处」的：
    #      --xp-blue* 一族、任务栏渐变、装饰图路径、字体名、窗口阴影、开始按钮）；
    #   ② **尺寸/间距类变量**（--bubble-min-h 这种），它们不是颜色，
    #      本来就不该有深色版 —— 2026-10 第一次跑这道门禁时误报了这三个。
    # 判据用「值里有没有颜色记号」，比维护一长串排除前缀更准。
    DARK_EXEMPT_PREFIX = ("--xp-blue", "--font-", "--taskbar", "--desktop",
                          "--win-shadow", "--start-", "--tray-")
    COLORISH = re.compile(r"#|rgba?\(|hsla?\(|\b(?:white|black|transparent|currentColor)\b",
                          re.I)
    root_m = re.search(r":root\s*\{(.*?)\n\}", css, re.S)
    if not root_m:
        warn("xp-custom.css 里找不到 :root 变量块，深色配对检查跳过")
        gate_notes.append("未找到 :root")
    else:
        # 把所有 :root 块合起来看（正常只有一个；多出来的是别人加的，
        # 更该查。2026-10 自测时发现只读第一个块会漏掉后加的孤儿变量）。
        root_bodies = "\n".join(m.group(1) for m in re.finditer(r":root[^{]*\{(.*?)\n\}", css, re.S))
        root_vars = []
        for vm in re.finditer(r"(--[a-z0-9-]+)\s*:\s*([^;\n]+)", root_bodies):
            name, val = vm.group(1), vm.group(2)
            if COLORISH.search(val) and not name.startswith(DARK_EXEMPT_PREFIX):
                if name not in root_vars:
                    root_vars.append(name)
        # 收集所有 html.dark 块里声明的变量
        dark_vars = set()
        for dm in re.finditer(r"html\.dark[^{]*\{(.*?)\n\}", css, re.S):
            dark_vars.update(re.findall(r"(--[a-z0-9-]+)\s*:", dm.group(1)))
        missing = [v for v in root_vars if v not in dark_vars]
        if missing:
            warn("这些颜色变量只在 :root 定义、html.dark 里没有对应（深色下会漏用浅色值）："
                 "%s —— 判定方法见 DESIGN.md 第 3 节；确实不该有深色版的，"
                 "把前缀加进本节的 DARK_EXEMPT_PREFIX" % "、".join(missing[:8]))
            gate_notes.append("深色未配对 %d 个" % len(missing))
        else:
            gate_passed.append("颜色变量深色成对（%d 个 :root 颜色变量已核）" % len(root_vars))

    # --- 10.3 反规则：现代组件库的默认长相 --------------------------------
    # 这些是 Patina 列的头号禁忌，也是本站最容易被 AI 助手写回去的东西。
    # 用「属性+值」的精确模式，不用裸关键词 —— 裸词会误伤：
    # 实测搜 "slate" 命中 27 处 translateY，"Inter" 命中 30 处 pointer。
    BANNED_PATTERNS = [
        (re.compile(r"font-family\s*:[^;]*\b(Inter|Roboto|Helvetica|Arial)\b", re.I),
         "现代无衬线字体（Inter/Roboto/Helvetica/Arial）—— 本站用自托管像素字体"),
        (re.compile(r"font-family\s*:\s*system-ui"), "把 system-ui 当字体名"),
        (re.compile(r"linear-gradient\s*\([^)]*#(?:8b5cf6|3b82f6|6366f1)\b", re.I),
         "紫蓝 AI 渐变"),
        (re.compile(r"box-shadow\s*:[^;]*0\s+4px\s+12px\s+rgba\(0\s*,\s*0\s*,\s*0"), "灰卡片阴影"),
        # 8–16px 圆角本身不是错（5.2 表里 8px/12px 都有正经用途），错的是
        # 「给浮动卡片加大圆角」。所以只在**同时**出现卡片特征时才报：
        #   该规则块里有 border-radius 8–16px，且该块带 box-shadow。
        # 第一版写成裸扫 8–16px 圆角，结果把 5.2 表里已批准的
        # .meta-chip(12px)/.email-label(8px) 全报了一遍 —— 属于误报。
    ]
    hits = []
    for i, ln in enumerate(css_lines, 1):
        code = ln.split("/*")[0]
        for rx, why in BANNED_PATTERNS:
            if rx.search(code):
                hits.append("L%d %s" % (i, why))

    # 浮动圆角卡片：按规则块检查（圆角 8–16px + 有阴影 = 现代卡片长相）
    block_re = re.compile(r"([^{}]+)\{([^{}]*)\}", re.S)
    for bm in block_re.finditer(css):
        sel, body = bm.group(1).strip().splitlines()[-1].strip(), bm.group(2)
        rm = re.search(r"border-radius\s*:\s*([^;]+);", body)
        if not rm:
            continue
        val = rm.group(1).strip()
        single = re.match(r"^(\d+)px$", val)
        if not (single and 8 <= int(single.group(1)) <= 16):
            continue
        if "box-shadow" not in body:
            continue
        # 已在 5.2 表里登记过的例外不报
        if any(k in sel for k in (".meta-chip", ".email-label", ".xp-firework-text")):
            continue
        ln = css[:bm.start(2)].count("\n") + 1
        hits.append("L%d %s 用了 %s 圆角 + 阴影（浮动圆角卡片长相）" % (ln, sel, val))

    if hits:
        warn("xp-custom.css 命中反规则清单：%s —— 见 DESIGN.md 第 5 节与 5.2" % "；".join(hits[:4]))
        gate_notes.append("反规则 %d 处" % len(hits))
    else:
        gate_passed.append("未命中反规则清单（字体/渐变/圆角卡片/阴影）")

    # --- 10.4 xp-custom.css 必须唯一真源，不许被复制成第二份 ---------------
    # 曾经 v3.0 时代组件样式被抄到 6 个页面各自演化，同一组件三套值。
    # 这里查「同一组件样式是否又散落在其它 .css」。
    other_css = [f for f in glob.glob(os.path.join(ROOT, "source", "**", "*.css"), recursive=True)
                 if os.path.normcase(f) != os.path.normcase(CSS_MAIN)
                 and "vendor" not in os.path.normcase(f).split(os.sep)]
    dup = []
    for f in other_css:
        txt = open(f, encoding="utf-8", errors="replace").read()
        if ".xp-window" in txt or ".xp-taskbar" in txt or ".xp-btn" in txt:
            dup.append(os.path.relpath(f, ROOT))
    if dup:
        warn("XP 组件样式出现在 xp-custom.css 以外：%s —— "
             "本站规定组件样式只进 xp-custom.css（见 DESIGN.md 第 4 节）" % "、".join(dup))
        gate_notes.append("组件样式外泄 %d 处" % len(dup))
    else:
        gate_passed.append("XP 组件样式未外泄（唯一真源）")

    for g in gate_passed:
        print("   √ %s" % g)
    if not gate_passed and not gate_notes:
        print("   （无检查项）")

# ---------------------------------------------------------------- 10.5 JS 语法门禁
# README 13.3a「注入的 JS 必须单独做语法检查」—— 2026-11-01 曾因 xp-content.js 里
# routeJs 的模板字符串引号没闭合，生成出 public/js/xp-win-actions.js 语法错误，
# 导致全站 40 个页面的窗口「最小化/最大化/关闭」三键全部失效。原因正是没有机器拦。
# 这里把「每个注入到产物的 JS 都能过 node --check」变成硬门禁。
print("\n== JS 语法检查（node --check 所有产物脚本） ==")
_js_dir = os.path.join(PUB, "js")
_js_bad = []
if not os.path.isdir(_js_dir):
    warn("缺少 public/js/ 目录，跳过 JS 语法检查")
else:
    nodejs = shutil.which("node") or shutil.which("node.exe")
    if not nodejs:
        warn("找不到 node，跳过 JS 语法检查")
    else:
        for _js_f in sorted(f for f in os.listdir(_js_dir) if f.endswith(".js")):
            _js_p = os.path.join(_js_dir, _js_f)
            try:
                _r = subprocess.run([nodejs, "--check", _js_p],
                                     capture_output=True, text=True, timeout=60)
            except subprocess.TimeoutExpired:
                fail("JS 语法检查超时：%s" % _js_f)
                continue
            if _r.returncode != 0:
                # node --check 的报错定位到文件内部行号，把首行错误贴出来方便查
                _err = ""
                for _ln in (_r.stderr or _r.stdout or "").splitlines():
                    if _ln.strip():
                        _err = _ln.strip()
                        break
                fail("%s 语法错误：%s" % (_js_f, _err))
                _js_bad.append(_js_f)
        if not _js_bad:
            print("   √ %d 个产物脚本全部通过 node --check" %
                  len([f for f in os.listdir(_js_dir) if f.endswith(".js")]))

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
