# 维护手册（MAINTENANCE）

这份文档是给**站主本人**和**接手改站的 AI 助手**看的。

> **站主只需看第 1–7、11、12 节**（速查 → 目录 → 命令 → 回滚 → 写作 → 样式 → 标签 → 换内容 → 发布）。
> 第 8–10、13 节是排障细节与给 AI 的约定，不看也不影响你自己改站。

---

## 1. 一分钟速查

| 我想… | 改哪里 | 改完要做什么 |
|---|---|---|
| 写一篇文章 | `source/_posts/新建文件.md` | `npm run build` |
| 加一件作品（带封面卡片） | 跑 `tools/add-artwork.py` 导入图 + 新建文章填 front matter | 同上（首页与作品页会自动出现卡片） |
| **改名字 / 自我介绍 / 图标行链接 / 多个邮箱** | `source/_data/profile.yml` | 同上（首页 + 侧栏同步；关于页已取消） |
| **改首页气泡句子** | `source/_data/quotes.yml` | 同上（`rotate_seconds` 控制轮换） |
| **改作品栏目（原创/同人）** | 文章 front matter 加一行 `origin: 原创` 或 `origin: 同人` | 同上 |
| **改作品分期** | 按 `date` 自动归入；要手动就写 `era: 2025 年` | 分期区间在 `scripts/xp-content.js` 的 `WORK_ERAS` |
| **放两边装饰图** | `source/images/decor/left.png` 与 `right.png` | 同上（仅在窗口 ≥1500px 宽时显示） |
| **换手写字体** | 覆盖 `source/fonts/caveat-latin.woff2`，并在 `xp-custom.css` 第 0 节改 family 名 | 同上（自托管，不请求 Google） |
| **换深色模式壁纸** | 覆盖 `source/images/xp-desktop-bg-dark.jpg` | 同上（浅色壁纸是 `xp-desktop-bg.jpg`） |
| **改开始菜单条目** | `scripts/xp-taskbar.js` 里的开始菜单部分 | 同上（**改完要重启预览服务**） |
| 改待办事项 | `source/_data/todo.yml` | 同上（**只在杂谈页显示**，全部条目按 进行中→待做→已完成 排） |
| 加游戏或小工具 | `source/_data/apps.yml` | 同上 |
| 加攻略/教程条目 | `source/_data/guides.yml` | 同上 |
| 启用首页播放器 / 换歌单 | `source/_data/music.yml` | 同上（可填自有曲目或网易云歌单 id） |
| 换头像 | 覆盖 `source/images/site-avatar.png` | 同上 |
| 换浅色壁纸 | 覆盖 `source/images/xp-desktop-bg.jpg` | 同上 |
| 换主题色 / 圆角 / 间距 | `source/css/xp-custom.css` 顶部 `:root` 与 `html.dark` | 同上（**浅色深色两处都要改**） |
| 调首页格子排布 | `source/index.md` 末尾 `<style>`（12 栏 × 96px 行高，按横带排） | 同上 |
| 改导航菜单 | `_config.minimalism.yml` 的 `menu` | URL **结尾要带 `/`** |
| 改/去掉页脚社交图标 | `_config.minimalism.yml` 的 `contact` | 同上（留空即整块不显示；与首页图标行 `profile.yml` 无关） |
| 改站名 / 描述 / 作者 | `_config.yml` | 同上 |
| 发到线上 | `.\deploy.ps1` | 会依次做 clean → generate → deploy |

> **想彻底把示例内容换成自己的 → 直接看第 11 节，那是一份照着做就行的清单。**

**看效果的两个入口**（实测区别，2026-10 验证）：

| 入口 | 是什么 | 特点 |
|---|---|---|
| **http://localhost:4000/** | Hexo Pro 客户端自带预览（打开客户端就在跑） | 用**它自己那份 Hexo 实例**渲染，**不读磁盘 `public/`**；改完内容要在客户端里刷新/重新生成（或重启客户端）才看到 |
| **http://127.0.0.1:4010/** | 命令行预览：`npm run server` | 读磁盘、自动热更新，**永远是最新的**；需要时再起（默认只留客户端那台） |

> ⚠️ 别双击 `public/index.html` 打开（资源是绝对路径，`file://` 下会 404 变成纯文本）。

---

## 2. 目录地图

```
D:\tools\hexo
├─ source/                       ← 站点内容，日常改这里
│  ├─ _posts/                    文章（文件名即 URL，用英文短横线命名）
│  ├─ _data/                     数据文件（页面上的清单只在这里维护一份）
│  │  ├─ todo.yml                待办：只在杂谈页「待办清单」窗口显示
│  │  ├─ apps.yml                游戏/工具卡片
│  │  ├─ guides.yml              攻略/教程清单
│  │  └─ music.yml               播放器曲目（默认空）
│  ├─ index.md                   首页（XP 桌面 + 便当格）
│  ├─ works|games|guides/index.md   其余 3 个桌面式页面
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

npm run build             # = hexo clean + hexo generate —— 日常都用这个
npm run generate          # 仅增量生成：只改了文章/样式时可以用，快一点
npm run server            # 本地预览 http://127.0.0.1:4010/（4000 被 Hexo Pro 客户端占用）
.\deploy.ps1              # 清理 + 生成 + 部署到 GitHub Pages
```

### 3.1 改了东西之后要做什么

| 你改了什么 | 要执行什么 |
|---|---|
| `source/_data/*.yml`（名字、简介、句子、曲目、待办、清单…） | **`npm run build`**（必须 clean + generate）；用客户端看效果的话，回客户端**刷新/重新生成**一次 |
| 文章 `source/_posts/*.md` | **`npm run build`** |
| 图片（头像/壁纸/作品图/装饰图） | **`npm run build`** |
| 模板 `themes/minimalism/layout/*.ejs` | 预览会自动热加载，刷新即可；发布前 `npm run build` |
| 样式 `source/css/xp-custom.css` | 刷新即可（顽固时 `Ctrl + F5`；链接带内容版本号，不用清缓存） |
| `scripts/*.js`（构建期脚本、任务栏、内容标签） | **先重启预览服务**，再 `npm run build` |
| 想让线上生效 | 以上做完，再 `.\deploy.ps1` |

> 一句话记法：**改数据/图片/文章 → build；改模板/样式 → 刷新；改 `scripts/` → 先重启预览再 build。**

两个附带习惯：
1. **构建前先停预览服务**（两边同时操作 `public/` 偶尔会出现"构建成功但 public 没了"）；
2. 之所以默认带 clean：Hexo 的增量生成**感知不到** `_data/*.yml` 与 `scripts/*.js` 的改动（实测：改 `profile.yml` 后增量生成仍是旧内容）。

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
date: 2026-10-05 16:00:00     # 必填，决定 URL、排序与作品分期
categories: [作品, 素描]       # 第一个是分组，后面的是子分类（作品页的分类标签由它生成）
origin: 原创                  # 作品栏目：原创 / 同人（只有作品用得到，不填按原创算）
# era: 2025 年                # 可选：手动指定作品的时间轴分期，不写就按 date 自动归入
tags: [素描, 静物]             # 作品页可点这些标签筛选/屏蔽
short_title: 陶罐与水果        # 卡片上显示的短标题（不填则用 title）
desc: 一句话简介               # 首页「最近作品」与卡片摘要用
img: /images/works/sketch.jpg          # 文章页顶部大图
thumbnail: /images/works/sketch-thumb.jpg   # 卡片缩略图（用 -thumb 小图，省流量）
status: done                  # done / doing（作品卡片上的状态角标）
---
```

- 文件名决定 URL：请用英文短横线（例如 `work-still-life-sketch.md`），**不要用中文**，否则地址栏会出现 `%E4%BD%9C...` 这种编码。
- 文章里可以插图片；图片会自动加懒加载，点击可以放大。
- 想让某篇文章不进首页列表？front matter 加 `hide: true`。
- **作品的两条额外规则**（只有 `categories` 里含「作品」的文章才算作品）：
  - 栏目：`origin: 原创` 或 `origin: 同人`，决定卡片出现在作品页哪个栏目下；
  - 分期：按 `date` 自动归入（远古期 / 2024 年 / 2025 年 / 2026 年上半年 / 2026 年 6-10 月），想手动指定就写 `era:`。
  - 分期区间想改就去改 `scripts/xp-content.js` 顶部的 `WORK_ERAS`（有注释说明）。

### 5.2 页面分两类（很重要）

| 类型 | front matter | 渲染模板 | 用途 |
|---|---|---|---|
| **桌面式页面** | `layout: xp-page` | `layout/xp-page.ejs`：页面自己画 XP 窗口/便当格 | 首页、作品、游戏、攻略、标签、分类 |
| **普通页面** | `layout: page` | `layout/page.ejs`：自动套 XP 窗口外壳（标题栏 + 两栏 + 侧栏） | 以后新增的说明页、留言板之类 |
| **文章** | `layout: post`（默认） | `layout/post.ejs`：窗口外壳 + 大图 + 两栏 + 目录 + 相关文章 | 所有 `source/_posts/` 下的文章 |
| **列表/归档/标签** | 自动 | `index.ejs` / `archive.ejs` / `tag.ejs` | 由生成器决定，不用手动写 |

新增页面时：复制 `source/works/index.md` 或 `source/games/index.md` 就是桌面式；只想写一篇普通长文页面就用 `layout: page`；`source/tags/index.md`、`source/categories/index.md` 是两个索引页的现成例子。

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

### 6.3 作品页（画廊）是怎么拼起来的

作品页的主体是 `{% xp_work_gallery %}` 一个标签生成的，结构如下（改样式就改 `xp-custom.css` 第 8 节的 `.work-*` / `.filter-*`）：

| 部件 | 类名 | 数据来源 |
|---|---|---|
| 原创 / 同人 切换 | `.work-tab` | 文章 front matter 的 `origin:` |
| 标签筛选 + 屏蔽模式 | `.filter-pill` / `#work-block-mode` | 文章 `tags:`（自动统计个数） |
| 时间轴分期（可折叠） | `.work-era` / `.work-era-bar` | `date` 自动归入，或 `era:` 手动指定；**每个栏目里最新的一档默认展开** |
| 作品卡片（等大） | `.work-card` | `thumbnail` / `short_title` / `date` / `tags` / `status` |
| 展开全文 / 收起 | `.work-expand` / `.work-card-full` | **按需加载** `/works-bodies.json`（见第 8 节第 14 条） |

分期区间集中在 `scripts/xp-content.js` 顶部的 `WORK_ERAS`：`from` 含、`to` 不含，最后一档 `to: null` 表示"至今"。**改完必须重启预览服务**（它是构建期脚本）。

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
| `{% xp_todo 4 %}` | 待办清单（`4` = 只显示前 4 条；`0` = 显示全部） |
| `{% xp_apps %}` | 游戏/工具卡片（按 `_data/apps.yml` 生成） |
| `{% xp_guides %}` | 攻略清单（按 `_data/guides.yml` 生成） |
| `{% xp_work_gallery %}` | 作品页：原创/同人分栏 + 时间轴分期折叠 + 标签筛选/屏蔽 + 就地展开全文 |
| `{% xp_tag_index %}` / `{% xp_category_index %}` | 标签 / 分类索引页的卡片网格 |
| `{% xp_music %}` | 播放器曲目与 APlayer（按 `_data/music.yml`） |

---

## 8. 已知的坑（都是踩过的，改之前先看一遍）

1. **整块 HTML 的页面里，所有标签必须顶格写。** 某一行缩进 4 个空格、且它前面有空行时，markdown 会认定这是「代码块」，整段 HTML 会被转义成文本、`{% %}` 标签也不会生效（作品页曾经整页变成代码）。
2. **正文里不要出现字面的模板定界符**（两个花括号/花括号加百分号那种写法）。构建用的 Nunjucks 会去解析它并直接报错；**注释里也不行**——注释里的标签照样会执行一遍，白白复制一份 HTML 到页面里（作品页踩过，页面里出现两份画廊）。
3. **深色模式成对写**：新组件必须同时给 `html.dark` 分支，否则深色下文字会看不清。
4. **主题是自持的**：不要再 `npm i hexo-theme-minimalism`。要改模板就改 `themes/minimalism/layout/` 下的文件（`themes/` 的优先级高于 `node_modules/`）。
5. **依赖已经锁死版本**：不要跑 `npm update`。真要升级就一次只升一个包，升完立刻 `npx hexo clean && npx hexo generate` 并本地预览确认。
6. **图片用两套**：卡片用 `*-thumb.jpg`（长边 480），文章大图用原图；压缩脚本在 `tools/optimize-images.py`（会自动把原图备份到 `backup/`）。
7. **头像文件名固定为 `site-avatar.png`**：不要用 `avatar.png`，那是主题自带的占位图，主题资源后写入会把你的覆盖掉。
8. **`public/` 是构建产物**：不要手改，也不要提交。
9. **改了 `scripts/*.js` 必须重启本地预览服务**：文章、模板、样式会热加载，但 `scripts/` 下的构建期脚本只在启动时加载一次。只改了模板或 CSS 不用重启，改了 JS 一定要重启，否则你会看到"改了没效果"然后又去改一遍。
10. **文章/列表/归档页的外壳结构在主题模板里**，不在构建脚本里。想改标题栏文案、信息条字段、两栏比例，改 `themes/minimalism/layout/{post,index,archive,tag,page}.ejs` 与 `xp-custom.css` 第 10 节。
11. **改了样式却看不到变化时先强制刷新**：`xp-custom.css` 的链接已自动带内容版本号（`?v=xxxxxxxx`，由文件哈希生成），正常情况不会再吃缓存；若仍异常，用 `Ctrl + F5`（Mac 是 `Cmd + Shift + R`）强制刷新，或确认自己看的端口/页面是否正确——例如首页是 XP 桌面便当格，**文章页/杂谈页/归档页/标签页才是两栏新版式**。
12. **改了 `_data/*.yml` 却"没生效"**：增量 `hexo generate` 感知不到数据文件与 `scripts/*.js` 的变化，必须 `npm run build`（内部先 clean）。这是实测过的行为，不是你的错觉。
13. **含中文的文件不要用 PowerShell 的 `-replace` / `Set-Content` 去改**：会把中文写成 `?`，YAML/CSS 直接损坏（排查时非常容易误判成"功能没生效"）。要批量改就用编辑器，或用 Python 以 UTF-8 读写。
14. **窄屏下 `flex-basis` 会变成「高度」**：底部「搜索 & 致谢」窗口里 `.links-col { flex: 1 1 420px }`、`.credits-col { flex: 0 1 460px }`，一旦在媒体查询里把容器改成 `flex-direction: column`，这两个 basis 就变成高度，窗口被撑到 800+px（移动端就是这样变长的）。规则：**凡是把容器改成纵向排列的地方，都要同时把子项的 flex-basis 复位**（`flex: 0 0 auto` 或改用 `width`）。
15. **`localhost:4000` 与 `127.0.0.1:4010` 是两套预览，别混**：4000 是 Hexo Pro 客户端的预览，它用自己那份 Hexo 实例渲染，**完全不读磁盘 `public/`**（实测：我用 `clean` 删掉 `public/` 后它照样返回旧的 41 628 字节；我 build 出 42 313 字节的新页面它也不变），所以"改了没生效"通常是它 —— 需要在客户端里刷新/重新生成。4010 是 `npm run server`，读磁盘、热更新，永远最新，我做验证用它。两套同时起时，端口 4000 会因被占而只绑到 IPv6，两个进程"各回答一半请求"，更难排查。
16. **源码页面（`source/*/index.md`）渲染时，文章的 `content` 还没写入**。这是六、七次踩到的同一类顺序问题：在页面里用标签读文章正文会拿到空字符串（读 front matter 字段、`thumbnail`、`desc` 都没问题，读 `content` 不行）。
    需要"页面渲染后才知道全量数据"的东西，一律用**生成器**输出成 JSON 再由前端按需取——作品页的「展开全文」就是这么做的（`scripts/xp-content.js` 里的 `xp-work-bodies` 生成器 → `/works-bodies.json` → 点开时才 fetch）。同理，统计数字那种要在加载期就正确的，直接查 `hexo.database.model('Post')` 而不要用 `hexo.locals`。

---

## 9. 给 AI 助手的工作说明

> 这一节是写给「下一个接手改站的 AI」的，站主可以不用看。

**站点构成**：Hexo 7.3 + 自持主题 `themes/minimalism`（源自 hexo-theme-minimalism 1.4.4，已本地化并可自由修改）+ 自研 XP 设计系统。

**单一真源（改之前先读这些，不要猜）**

| 关注点 | 文件 |
|---|---|
| 所有 XP 组件与颜色 | `source/css/xp-custom.css`（分 13 节，含 token 与深色分支） |
| 页面内容与网格排布 | `source/index.md`、`source/{works,games,guides,todo,tags,categories}/index.md` |
| 页面骨架（外壳/两栏/侧栏） | `themes/minimalism/layout/{post,page,index,archive,tag,xp-page}.ejs` 与 `includes/xp-*.ejs` |
| 数据驱动的内容标签与 helper | `scripts/xp-content.js` |
| 懒加载、图片放大、目录跟随、SEO | `scripts/xp-enhance.js` |
| 任务栏与开始菜单 | `scripts/xp-taskbar.js` |
| 站点/主题配置 | `_config.yml`、`_config.minimalism.yml` |

**改动流程（务必遵守）**

1. 先 `git add -A ; git commit -m "..."` 存一份基线（站主不一定会做，请主动做）。
2. 改完执行 `npm run build`（clean + generate），确认退出码为 0、无 `WARN/ERROR`。
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

---

## 11. 把示例内容换成你自己的

现在站上的文字和图片大多是搭站时填的**示例**。照下面顺序替换即可，全部在 `source/` 与几个配置文件里，**不需要改任何代码**。

改完统一执行：

```powershell
cd D:\tools\hexo
npm run build                       # 一定要 build（含 clean）
python tools\verify-site.py         # 自检：断链 / 未渲染标签 / 体积
npm run server                      # 打开 http://127.0.0.1:4010/ 看效果
```

### 11.1 身份与自我介绍（一个文件搞定）

文件：`source/_data/profile.yml` —— 首页与侧栏同时生效（关于页已删除，其文案现在显示在首页「关于本站」窗口）。

| 字段 | 作用 | 出现在 |
|---|---|---|
| `names` / `name_suffix` | 首页大标题「<网名> 来了！」；多个网名会轮换（`name_rotate_seconds` 设间隔，0 = 每次刷新随机） | 首页；`names` 第一个兼作侧栏用户名 |
| `bio` | 侧栏一句话简介 | 文章/列表/归档页侧栏 |
| `avatar` | 头像路径 | 首页、侧栏 |
| `tagline` / `intro` | 首页正文段落 | 首页 |
| `chips` / `buttons` | 备用（首页现在用图标行，这两个键留着随时换回胶囊/按钮） | 首页 |
| `contacts.*` | 图标行链接（GitHub/B站/小红书/X/邮箱…，**留空就不显示**） | 首页用户账户卡片 |
| `about.paragraphs` / `about.chips` | 站点风格说明、站点标签 | 首页底部「搜索 · 关于本站 · 致谢」窗口中间一段 |

**多个邮箱**：图标行只有一个信封图标；配了多个地址时点它弹出小窗列出全部（带标签的显示成胶囊），只配一个时点图标直接发信。写法：

```yaml
contacts:
  email:
    - 个人：me@example.com        # 字符串带标签（冒号全角半角都行）
    - 工作: work@example.com
    - backup@example.com          # 不带标签也行
```

弹窗里的说明文字取自 `about.contact_desc`。**为什么不做在图标行里**：账户卡片高度固定 210px，再加一行会被裁掉；几个相同的信封图标也分不清谁是谁。

### 11.2 首页句子气泡

文件：`source/_data/quotes.yml`

- `rotate_seconds: 12` —— 每隔 12 秒自动换一句；填 `0` 表示只在刷新页面时随机取一句。
- `quotes:` 下面想加多少条加多少条；每句建议 **不超过 60 字**（便签格子高度固定，太长会被裁掉）。

### 11.3 音乐

文件：`source/_data/music.yml`，二选一：

- **自有音频（推荐）**：`tracks:` 里填 `title/author/album/url/pic`，音频文件放 `source/music/`（或任何 `https://` 直链）。界面上是 XP 风格播放器，**只有真的填了曲目才加载 APlayer**。
- **网易云歌单**：填 `netease_playlist: <歌单id>`（歌单链接里 `id=` 后面那串数字）。用的是网易云官方外链播放器，**外观不套 XP 皮肤**，且依赖网易云服务、歌曲版权与地区。
- 都不填 = 显示「未配置曲目」空状态，不加载任何第三方脚本。

### 11.4 图片

| 想换什么 | 怎么换 |
|---|---|
| 头像 | 覆盖 `source/images/site-avatar.png`（建议 256×256 的方形图）。**不要**改名叫 `avatar.png`，那是主题自带的占位图 |
| 浅色壁纸 | 覆盖 `source/images/xp-desktop-bg.jpg`（建议 1920×1080 以内） |
| 深色壁纸 | 覆盖 `source/images/xp-desktop-bg-dark.jpg`（尺寸同上；不想单独做深色版，就把它换成同一张图的副本） |
| 两侧装饰 | 放 `source/images/decor/left.png` 与 `source/images/decor/right.png`（png / gif / webp / jpg 都行，**动图也支持**）。窗口宽度 ≥1500px 时才显示，位置在页面左右留白区 |
| 作品图 | 用下面的导入工具，会自动生成主图与缩略图 |

导入作品图（把你的画放进任意位置，然后运行）：

```powershell
python tools\add-artwork.py "D:\我的画\山间小屋.png" landscape-cottage --title "风景插画·山间小屋" --desc "一句话简介"
```

它会生成 `source/images/works/landscape-cottage.jpg`（长边 1200，文章大图）与 `...-thumb.jpg`（长边 480，卡片缩略图），把原图备份到 `backup/`，并打印一段可直接粘贴的 front matter（含 `origin:` 那一行）。若提示缺 Pillow：`pip install Pillow`。

### 11.5 示例文章

| 文件 | 建议 |
|---|---|
| `source/_posts/hello-world.md` | Hexo 自带示例，**留着当"文章格式参考"**即可，也可以直接删 |
| `source/_posts/work-still-life-sketch.md`<br>`work-character-practice.md`<br>`work-landscape-cottage.md` | 三篇作品示例（其中「角色练习·魔法少女」故意标了 `origin: 同人`，用来看两个栏目效果）。换成自己的作品（用 11.4 的工具生成 front matter），或直接删掉——删掉后作品页会少一张卡片，「最近作品」会同步，"作品"计数也会自动变化 |

文章正文里的文字（"传统素描练习，陶罐 + 水果组合。"之类）都是示例文案，直接改成你自己的即可；卡片上的摘要优先取 front matter 的 `desc`，没写才取正文第一段。

> 顺带说明两个"位置调整"，别在新版页面里找不到：
> - **「关于」页已整个删掉**（原文备份在 `backup/about.index.md.bak`），内容并进首页底部那个通栏窗口（标题就是「搜索 · 关于本站 · 致谢」）；
> - 首页「用户账户」的自我介绍与底部那段站点说明**不要写重复的话**（曾经两句几乎一样，2026-10 已去重）；
> - 指向关于内容的入口统一用锚点 **`/#about`**（快速导航「关于」瓦片、侧栏「关于我」卡片的按钮都指这里）；
> - 开始菜单只保留 首页 / 作品 / 游戏·工具 / 攻略教程 / 杂谈 / 归档；底部那排友情链接按钮（XP.css / Hexo / GitHub）也已按站主要求删除。

### 11.6 站点配置

| 文件 | 改什么 |
|---|---|
| `_config.yml` | `title`（站名）、`description`（一句话描述，也用于搜索与分享卡片）、`author` |
| `_config.minimalism.yml` | `menu`（导航菜单，**URL 结尾要带 `/`**）、`contact`（页脚社交图标）、`bottom_link.rss`（想开 RSS 再填） |

### 11.7 收尾自检

1. `npm run build` —— 退出码 0、没有 `WARN/ERROR`；
2. `python tools\verify-site.py` —— 输出「全部通过」，没有断链、没有未渲染的 `{% %}`；
3. 本地打开首页 / 作品页 / 杂谈页 / 一篇文章，确认名字、介绍、图片、句子气泡、播放器都是你要的样子；
4. 满意就 `git add -A ; git commit -m "换成我自己的内容"`，然后 `.\deploy.ps1` 发布。

---

## 12. 部署到 GitHub Pages（以及"卡住不动"怎么办）

发布用一条命令：

```powershell
cd D:\tools\hexo
.\deploy.ps1              # = clean → generate → 清理多余 JS → hexo deploy
```

`hexo deploy` 做三件事：把 `public/` 同步到仓库内的 `.deploy_git/` → 在里面提交（提交信息是 `Site updated: 时间`）→ 推送到 `https://github.com/Jawooth/Jawooth.github.io.git` 的 `gh-pages` 分支。线上地址是 **https://jawooth.github.io/**。

### 12.1 卡在 `Writing objects: 100% …` 不动

**这不是操作错了**，是 git 通过本机代理（Clash Verge，`127.0.0.1:7897`）走 HTTP/2 时，在上传完成后"等服务器回执"的阶段会挂住。判断与处理：

```powershell
# 1) 看是不是真的还卡着（列出 git 进程与命令行）
Get-CimInstance Win32_Process -Filter "Name='git.exe'" | ForEach-Object { $_.CommandLine }

# 2) 卡住就结束掉（只结束 git，别动其他进程）
Get-Process git,git-remote-https -ErrorAction SilentlyContinue | Stop-Process -Force

# 3) 确认远端当前指向哪次提交（能print出来就说明网络与凭据都是通的）
$env:GIT_TERMINAL_PROMPT=0; git ls-remote https://github.com/Jawooth/Jawooth.github.io.git refs/heads/gh-pages

# 4) 用 HTTP/1.1 重新推送（本机已全局配置好，正常情况不必再手动加参数）
cd D:\tools\hexo\.deploy_git
git -c http.version=HTTP/1.1 push -u https://github.com/Jawooth/Jawooth.github.io.git HEAD:gh-pages --force
```

已经做过的永久修复：`git config --global http.version HTTP/1.1`（就是为了绕开 12.1）。如果将来换了网络、或不再用本地代理，可以撤销：

```powershell
git config --global --unset http.version
```

### 12.2 几个要点

- **卡住不会丢东西**：静态文件已经在 `.deploy_git/` 里提交好了（日志里能看到 `Site updated: …`），网络恢复后重新推一次即可，不需要重新生成。
- **不要连点两次部署**：同时跑两个 `git push --force` 会互相抢，更容易卡住。先按 12.1 收尾，确认上一次结束再重试。
- **代理必须开着**：本机访问 GitHub 走代理（`http.proxy=http://127.0.0.1:7897`）。代理没启动时 git 会一直等到超时；绕过代理**直连是连不通的**。
- **推送成功后线上不是立刻更新**：GitHub Pages 还要构建，通常半分钟到两分钟。用浏览器打开 https://jawooth.github.io/ 并 `Ctrl + F5` 强刷。
- **判断线上是不是新版**：首页 HTML 字节数应与本机 `public/index.html` 一致（约 43 KB），样式链接会带内容版本号 `/css/xp-custom.css?v=xxxxxxxx`。

---

## 13. 体积与安全基线（清理后请保持）

### 13.1 当前基线

| 指标 | 数值 | 说明 |
|---|---|---|
| 已跟踪文件 | 104 个 | `git -C D:\tools\hexo ls-files` 数一下就知道了 |
| `.git` 目录 | ≈4 MB | 曾误提交过 600 MB 的客户端目录，已清理 |
| `public/` 产物 | ≈1.7 MB / 52 文件 | 其中 js 只有 `main.js`(10.8 KB)、style 只有 `main.css`(21.6 KB)、fonts 33 KB |
| 单页 HTML | 26–48 KB | 具体见 `tools/verify-site.py` 输出的体积表 |

### 13.2 已删除的「从不加载」厂商资源（10 个，1.45 MB）

`gitalk`、`twikoo`、`jquery`、`jquery.fancybox`、`simple-lightbox` 的 js+css，以及 `animate.min.css`、`prism.css` —— 共 1.45 MB。

- 它们只在 `comment.enable` / `photo_zoom` / `prismjs.enable` 打开时才被引用，而主题的 `source/` 会被整份复制进 `public/`，所以每次部署都白传。
- 要重新启用：把 `_config.minimalism.yml` 的 `cdn.enable` 设为 `true`（走 CDN），或从 npm 包取回这些文件。
- `verify-site.py` 已加检查，产物里再出现这些文件名会报错。保留的是 `main.css`、`main.js`、`iconfont.*`（都有实际引用）。

### 13.3 外链与 noopener

所有 `target="_blank"` 的外链都要带 `rel="noopener noreferrer"`（否则新窗口能通过 `window.opener` 反向控制本站）。主题的 `footer.ejs`、`navigation_bar.ejs` 已补齐 4 处；以后自己写页面/模板时照做。

### 13.4 不要把大文件放进仓库

仓库目录 `D:\tools\hexo` 同时也是 **Hexo Pro 客户端的安装位置**（`HexoPro/` 600+ MB，曾误提交过）。`.gitignore` 已忽略 `HexoPro/`、`data/`、`blogInfoList.json`、`backup/`；更稳的是把客户端装到仓库外面（如 `D:\tools\HexoPro`）。

### 13.5 密钥与隐私

- 评论密钥（gitalk `clientSecret`、twikoo `envId`）、统计、algolia、CDN **全部留空/关闭**；填真实密钥前先确认不会被提交。
- `.gitignore` 已含 `.env*`、`*.pem`、`*.key`、`*.p12`、`*.pfx`、`credentials.json`、`*_rsa`。
- 提交前快速自检：

```powershell
git -C D:\tools\hexo diff --cached | Select-String -Pattern 'secret|token|password|api[_-]?key|PRIVATE KEY'
```

- `/search.json`（全站搜索索引）和 `/works-bodies.json`（作品正文）都是**公开可下载**的，别往里写不想公开的内容。

### 13.6 第三方外部依赖（页面会联网请求它们）

**默认不请求任何第三方资源**：Caveat 已自托管（`source/fonts/caveat-latin.woff2`，73 KB，SIL OFL 1.1，中文走系统楷体），评论/统计/CDN/搜索全部关闭。下面两个只有你主动开启时才出现：

| 域名 | 用途 | 备注 |
|---|---|---|
| `cdn.jsdelivr.net` | APlayer 播放器 | **只有 `music.yml` 里填了曲目才加载** |
| `music.163.com` | 网易云歌单 iframe | 只有填了 `netease_playlist` 才出现 |
