# 维护手册（MAINTENANCE）

这份文档是给**站主本人**和**任何接手改站的 AI 助手**看的。规则很简单：改任何东西之前先看这里，改完按这里的方法验证。

---

## 1. 一分钟速查

| 我想… | 改哪里 | 改完要做什么 |
|---|---|---|
| 写一篇文章 | `source/_posts/新建文件.md` | `npx hexo clean && npx hexo generate` |
| 加一件作品（带封面卡片） | 同上，front matter 填 `img / thumbnail / short_title / desc` | 同上（首页与作品页会自动出现卡片） |
| 改待办事项 | `source/_data/todo.yml` | 同上（首页 / 待办页 / 杂谈页同时更新） |
| 加游戏或小工具 | `source/_data/apps.yml` | 同上 |
| 加攻略/教程条目 | `source/_data/guides.yml` | 同上 |
| 启用首页播放器 | `source/_data/music.yml`（填曲目） | 同上（填了才会加载 APlayer） |
| 换头像 | 覆盖 `source/images/site-avatar.png` | 同上 |
| 换桌面壁纸 | 覆盖 `source/images/xp-desktop-bg.jpg` | 同上 |
| 换主题色 / 圆角 / 间距 | `source/css/xp-custom.css` 顶部 `:root` 与 `html.dark` | 同上（**浅色深色两处都要改**） |
| 调首页格子大小 | `source/index.md` 末尾 `<style>` 里的 `grid-column` | 同上 |
| 改导航菜单 | `_config.minimalism.yml` 的 `menu` | URL **结尾要带 `/`** |
| 改联系方式 | `_config.minimalism.yml` 的 `contact` | 同上 |
| 改站名 / 描述 / 作者 | `_config.yml` | 同上 |
| 发不到线上 | `.\deploy.ps1` | 会依次做 clean → generate → deploy |

本地预览：`npx hexo server`，然后浏览器打开 **http://127.0.0.1:4000/**（用 `127.0.0.1` 比 `localhost` 稳）。

> ⚠️ 不要双击 `public/index.html` 打开。站点所有资源路径都是绝对路径（`/css/...`），`file://` 下会全部 404，你会看到没有样式的纯文本。

---

## 2. 目录地图

```
D:\tools\hexo
├─ source/                       ← 站点内容，日常改这里
│  ├─ _posts/                    文章（文件名即 URL，用英文短横线命名）
│  ├─ _data/                     数据文件（页面上的清单只在这里维护一份）
│  │  ├─ todo.yml                待办：首页 + 待办页 + 杂谈页共用
│  │  ├─ apps.yml                游戏/工具卡片
│  │  ├─ guides.yml              攻略/教程清单
│  │  └─ music.yml               播放器曲目（默认空）
│  ├─ index.md                   首页（XP 桌面 + 便当格）
│  ├─ works|games|guides|todo|about/index.md   其余 5 个桌面式页面
│  ├─ css/xp-custom.css          ★ XP 设计系统（唯一真源，约 1300 行）
│  ├─ images/                    作品图 / 缩略图 / 头像 / 桌面背景
│  └─ favicon.ico                浏览器标签页图标
├─ themes/minimalism/            ← 主题（已「自持」，可自由改，不再走 npm）
│  ├─ layout/xp-page.ejs         桌面式页面模板（layout: xp-page）
│  ├─ layout/page.ejs            普通页面模板（layout: page，自动套窗口外壳）
│  ├─ layout/post.ejs            文章页：窗口外壳 + 两栏 + 目录 + 相关文章
│  ├─ layout/index.ejs           杂谈列表页：卡片流 + 侧栏
│  ├─ layout/archive.ejs         归档 / 分类页：时间线 + 侧栏
│  ├─ layout/tag.ejs             单个标签页：卡片流 + 侧栏
│  └─ layout/includes/xp-aside.ejs、xp-timeline.ejs    侧栏 widget 与时间线
├─ scripts/                      ← 构建期脚本（在 Node 里跑，不是浏览器脚本）
│  ├─ xp-content.js              内容标签 {% xp_xxx %}、侧栏/卡片/索引 helper、搜索索引
│  ├─ xp-enhance.js              图片懒加载、点击放大、目录跟随、SEO（title/canonical/og）
│  ├─ xp-taskbar.js              底部任务栏 + 开始菜单
│  └─ inject-xp-css.js           注入字体与 xp-custom.css
├─ tools/                        图片压缩、图标生成、站点核验脚本（手动运行）
├─ backup/                       原图备份（不会被发布）
├─ _config.yml                   站点配置
├─ _config.minimalism.yml        主题配置
└─ public/                       ← 构建产物，**不要手改**，每次 generate 会覆盖
```

---

## 3. 日常命令

```powershell
cd D:\tools\hexo

npx hexo clean            # 清掉缓存与 public（改了配置或样式后建议先 clean）
npx hexo generate         # 生成静态站点到 public
npx hexo server           # 本地预览 http://127.0.0.1:4000/
.\deploy.ps1              # 清理 + 生成 + 部署到 GitHub Pages
```

改了任何东西，**必须重新 generate** 才会生效（`hexo server` 会自动重建）。

---

## 4. 改坏了怎么回滚

这个仓库使用 Git 保存历史。

```powershell
cd D:\tools\hexo
git status                # 看有哪些文件被改过
git diff                  # 看具体改了什么
git checkout -- .         # 放弃全部未提交的改动，回到上次提交的状态
git log --oneline         # 看历史提交
```

**最重要的习惯：让 AI 动手之前，先 `git add -A ; git commit -m "改之前先存个档"`。** 这样任何改坏都能一条命令回到原样。

---

## 5. 内容怎么写

### 5.1 文章 front matter

```yaml
---
title: 静物素描·陶罐与水果     # 显示标题（可以中文）
date: 2026-10-05 16:00:00     # 必填，决定 URL 与排序
categories: [作品, 素描]       # 第一个是分组，后面的是子分类（作品页筛选按钮由它生成）
tags: [素描, 静物]
short_title: 陶罐与水果        # 卡片上显示的短标题（不填则用 title）
desc: 一句话简介               # 作品页精选卡片用
img: /images/works/sketch.jpg          # 文章页顶部大图
thumbnail: /images/works/sketch-thumb.jpg   # 卡片缩略图（用 -thumb 小图，省流量）
status: done                  # done / doing（作品卡片上的状态角标）
---
```

- 文件名决定 URL：请用英文短横线（例如 `work-still-life-sketch.md`），**不要用中文**，否则地址栏会出现 `%E4%BD%9C...` 这种编码。
- 文章里可以插图片；图片会自动加懒加载，点击可以放大。
- 想让某篇文章不进首页列表？front matter 加 `hide: true`。

### 5.2 页面分两类（很重要）

| 类型 | front matter | 渲染模板 | 用途 |
|---|---|---|---|
| **桌面式页面** | `layout: xp-page` | `layout/xp-page.ejs`：页面自己画 XP 窗口/便当格 | 首页、作品、游戏、攻略、待办、关于、标签、分类 |
| **普通页面** | `layout: page` | `layout/page.ejs`：自动套 XP 窗口外壳（标题栏 + 两栏 + 侧栏） | 以后新增的说明页、留言板之类 |
| **文章** | `layout: post`（默认） | `layout/post.ejs`：窗口外壳 + 大图 + 两栏 + 目录 + 相关文章 | 所有 `source/_posts/` 下的文章 |
| **列表/归档/标签** | 自动 | `index.ejs` / `archive.ejs` / `tag.ejs` | 由生成器决定，不用手动写 |

新增页面时：复制 `source/about/index.md` 就是桌面式；只想写一篇普通长文页面就用 `layout: page`；`source/tags/index.md`、`source/categories/index.md` 是两个索引页的现成例子。

---

## 6. 样式怎么改（不会写 CSS 也能改的四个旋钮）

全部在 `source/css/xp-custom.css` 的第 1 节 `:root`（浅色）与 `html.dark`（深色）里：

```css
--xp-blue-border: #0054e3;   /* 窗体蓝边框、按钮边、标题栏主色 */
--surface: #ffffff;          /* 窗体/卡片底色 */
--text-heading: #003399;     /* 标题文字色 */
--text-muted: #6b6b6b;       /* 次要文字色（日期、说明） */
--border: #d0cfbf;           /* 分隔线、卡片边 */
--link: #0000ee;             /* 链接色 */
```

**规则**：同一个变量在浅色区（`:root`）和深色区（`html.dark`）各有一份，**两处都要改**，否则深色模式会出现看不清的文字。

新增自定义组件时的约定：
1. 颜色一律用上面的变量，不要写死 `#888` 这种值。
2. 组件写在 `xp-custom.css` 里，**不要在页面里写内联样式**（页面里只允许写「网格排布」这类页面级规则）。
3. 类名用 `xp-` 前缀（组件）或 `bento-`/`<页面名>-` 前缀（页面级）。

### 6.1 侧栏 widget 栏（文章/列表/归档/标签页）

这几类页面是「两栏」结构：左边正文，右边侧栏。侧栏由 `themes/minimalism/layout/includes/xp-aside.ejs` 决定放哪些卡片，卡片内容由 `scripts/xp-content.js` 里的 `xp_widget_*` helper 生成：

| 想改什么 | 改哪里 |
|---|---|
| 侧栏放哪几张卡片、什么顺序 | `includes/xp-aside.ejs`（按 `kind` 区分：post 会多一张目录） |
| 卡片里显示什么内容 | `scripts/xp-content.js` 里对应的 `xp_widget_xxx` 函数 |
| 卡片外观、间距、小屏怎么折行 | `xp-custom.css` 第 10 节（`.xp-aside`、`.xp-widget`） |
| 文章摘要怎么取 | `xp-content.js` 的 `excerptOf()`：优先用 front matter 的 `desc`，否则取正文第一段 |

屏宽 ≤1000px 时侧栏会自动移到正文下方并横向铺开（见 CSS 里的 `@media (max-width: 1000px)`），不需要你做额外处理。

### 6.2 新的页面级组件

| 组件 | 用在哪 | 类名 |
|---|---|---|
| 文章卡片流（带封面） | 杂谈列表页、标签页 | `.xp-card-list` / `.xp-post-card`（由 `xp_post_cards` 生成） |
| 归档时间线 | 归档页、分类页 | `.xp-timeline-*`（由 `includes/xp-timeline.ejs` 生成） |
| 标签/分类索引卡片 | `/tags/`、`/categories/` | `.xp-index-grid` / `.xp-index-item`（由 `{% xp_tag_index %}`、`{% xp_category_index %}` 生成） |
| 相关文章 | 文章底部 | `.xp-related`（由 `xp_related(page, 3)` 生成） |

---

## 7. 内容标签（页面里能用的 {% xp_xxx %}）

页面里的数字和清单都是构建期生成的，**不要手写死**，否则一定会和真实数据对不上。

| 标签 | 作用 |
|---|---|
| `{% xp_num posts\|tags\|works\|workcats\|months\|todo_todo\|todo_doing\|todo_done\|apps_game\|apps_tool\|guides_planned\|guides_online %}` | 输出一个统计数字 |
| `{% xp_stat_rows %}` | 首页「小站数据」三行 |
| `{% xp_recent_posts 4 %}` | 最近更新列表 |
| `{% xp_recent_works 3 %}` | 最近作品横栏（含缩略图） |
| `{% xp_tag_cloud pill\|cloud %}` | 标签云 |
| `{% xp_todo mini\|full %}` | 待办（mini = 首页小窗；full = 待办页三栏） |
| `{% xp_apps %}` | 游戏/工具卡片（按 `_data/apps.yml` 生成） |
| `{% xp_guides %}` | 攻略清单（按 `_data/guides.yml` 生成） |
| `{% xp_work_cards %}` / `{% xp_work_filters %}` | 作品页的卡片与筛选按钮 |
| `{% xp_tag_index %}` / `{% xp_category_index %}` | 标签 / 分类索引页的卡片网格 |
| `{% xp_music %}` | 播放器曲目与 APlayer（按 `_data/music.yml`） |

---

## 8. 已知的坑（都是踩过的，改之前先看一遍）

1. **整块 HTML 的页面里，所有标签必须顶格写。** 某一行缩进 4 个空格、且它前面有空行时，markdown 会认定这是「代码块」，整段 HTML 会被转义成文本、`{% %}` 标签也不会生效（作品页曾经整页变成代码）。
2. **正文里不要出现字面的模板定界符**（两个花括号/花括号加百分号那种写法）。构建用的 Nunjucks 会去解析它并直接报错。
3. **深色模式成对写**：新组件必须同时给 `html.dark` 分支，否则深色下文字会看不清。
4. **主题是自持的**：不要再 `npm i hexo-theme-minimalism`。要改模板就改 `themes/minimalism/layout/` 下的文件（`themes/` 的优先级高于 `node_modules/`）。
5. **依赖已经锁死版本**：不要跑 `npm update`。真要升级就一次只升一个包，升完立刻 `npx hexo clean && npx hexo generate` 并本地预览确认。
6. **图片用两套**：卡片用 `*-thumb.jpg`（长边 480），文章大图用原图；压缩脚本在 `tools/optimize-images.py`（会自动把原图备份到 `backup/`）。
7. **头像文件名固定为 `site-avatar.png`**：不要用 `avatar.png`，那是主题自带的占位图，主题资源后写入会把你的覆盖掉。
8. **`public/` 是构建产物**：不要手改，也不要提交。
9. **改了 `scripts/*.js` 必须重启本地预览服务**：文章、模板、样式会热加载，但 `scripts/` 下的构建期脚本只在启动时加载一次。只改了模板或 CSS 不用重启，改了 JS 一定要重启，否则你会看到"改了没效果"然后又去改一遍。
10. **文章/列表/归档页的外壳结构在主题模板里**，不在构建脚本里。想改标题栏文案、信息条字段、两栏比例，改 `themes/minimalism/layout/{post,index,archive,tag,page}.ejs` 与 `xp-custom.css` 第 10 节。
11. **改了样式却看不到变化时先强制刷新**：`xp-custom.css` 的链接已自动带内容版本号（`?v=xxxxxxxx`，由文件哈希生成），正常情况不会再吃缓存；若仍异常，用 `Ctrl + F5`（Mac 是 `Cmd + Shift + R`）强制刷新，或确认自己看的端口/页面是否正确——例如首页是 XP 桌面便当格，**文章页/杂谈页/归档页/标签页才是两栏新版式**。

---

## 9. 给 AI 助手的工作说明

> 这一节是写给「下一个接手改站的 AI」的，站主可以不用看。

**站点构成**：Hexo 7.3 + 自持主题 `themes/minimalism`（源自 hexo-theme-minimalism 1.4.4，已本地化并可自由修改）+ 自研 XP 设计系统。

**单一真源（改之前先读这些，不要猜）**

| 关注点 | 文件 |
|---|---|
| 所有 XP 组件与颜色 | `source/css/xp-custom.css`（分 13 节，含 token 与深色分支） |
| 页面内容与网格排布 | `source/index.md`、`source/{works,games,guides,todo,about,tags,categories}/index.md` |
| 页面骨架（外壳/两栏/侧栏） | `themes/minimalism/layout/{post,page,index,archive,tag,xp-page}.ejs` 与 `includes/xp-*.ejs` |
| 数据驱动的内容标签与 helper | `scripts/xp-content.js` |
| 懒加载、图片放大、目录跟随、SEO | `scripts/xp-enhance.js` |
| 任务栏与开始菜单 | `scripts/xp-taskbar.js` |
| 站点/主题配置 | `_config.yml`、`_config.minimalism.yml` |

**改动流程（务必遵守）**

1. 先 `git add -A ; git commit -m "..."` 存一份基线（站主不一定会做，请主动做）。
2. 改完执行 `npx hexo clean && npx hexo generate`，确认退出码为 0、无 `WARN/ERROR`。
3. 跑 `tools/verify-site.py`（检查未渲染标签、内部断链、图片体积、页面体积）。
4. 视觉验证：用本机 Edge 无头截图（见第 10 节），至少看 **首页 / 作品页 / 文章页 / 杂谈页** 在 1600px 宽与 500px 宽下的效果，并确认深色模式可读。
5. 再 `git commit`。

**不要做的事**：不要改 `public/`；不要把 `node_modules/` 提交进去；不要给页面加内联 `<style>` 大段样式（组件样式必须进 `xp-custom.css`）；不要手写死在页面上的统计数字。

---

## 10. 视觉验证速查（本机可用）

```powershell
# 1) 起预览服务（后台）
cd D:\tools\hexo
npx hexo server          # http://127.0.0.1:4000/

# 2) 截图（Edge 无头）
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
& $edge --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 `
  --window-size=1600,1000 "--screenshot=C:\temp\home.png" "http://127.0.0.1:4000/"

# 3) 深色模式：复制 public 到临时目录，把 <html lang="zh-CN"> 换成加了 class="dark" 的版本，
#    再用 http.server 起另一个端口截图（不要用 PowerShell 的 Set-Content 批改 HTML，
#    中文会被转成 ? 导致结构损坏，请用 Python 以 utf-8 读写）
```

**注意**：Edge 无头模式有最小窗口宽度（约 500px）。`--window-size=390,844` 会被裁切并从约 496px 的布局截图，**不能**用它判断手机端是否溢出；要判断请用 500px 宽，并用「给页面注入测量脚本、把结果画在页面上再截图」的方式量化（见 `tools/verify-site.py` 里的说明）。

**核验脚本**：

```powershell
python tools\verify-site.py
# 或使用 DSH 内置 Python：
& "C:\Users\ASUS\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" tools\verify-site.py
```
