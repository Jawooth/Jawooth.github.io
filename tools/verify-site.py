#!/usr/bin/env python3
"""站点核验脚本 —— 每次改完跑一遍，确认没有把站改坏。

用法（在仓库根目录；注意是 py -3，本机 python 是系统商店的占位程序）：
    py -3 tools\verify-site.py

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
# 未渲染的模板标签：只认真正的标签起始符。
# 旧版这里还列了 "xp_num" 之类的裸标签名，结果页面上任何一处提到这些词
# （比如注释、文档、script 里的字符串）都会误报，所以改成匹配起始符本身。
BAD_TAG_RE = re.compile(r"\{%|\{\{")
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
             "（tools/fetch-netease.py 写入）；想手填曲目就改 music.yml 的 tracks")

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
for doc in sorted(glob.glob(os.path.join(ROOT, "*.md"))):
    dtxt = open(doc, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r"\]\((?!https?:|#|mailto:)([^)]+)\)", dtxt):
        target = m.group(1).split("#")[0].strip()
        if target and not os.path.exists(os.path.join(ROOT, target.replace("/", os.sep))):
            fail("%s 里的链接指向不存在的文件：%s" % (os.path.basename(doc), m.group(1)))

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
_doc_targets += sorted(glob.glob(os.path.join(ROOT, "tools", "*.py")))
for doc in _doc_targets:
    # verify-site.py 自己就写着这些名字（就是下面这张表），跳过
    if os.path.basename(doc) == "verify-site.py":
        continue
    dtxt = open(doc, encoding="utf-8", errors="replace").read()
    for pat, why in STALE_IN_DOCS.items():
        if pat in dtxt:
            warn("%s 里提到「%s」（%s）—— 若是在教用户这么做，请改掉"
                 % (os.path.relpath(doc, ROOT), pat, why))

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
