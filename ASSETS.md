# 素材与样式速查（ASSETS）

> 想换气泡 / 配色 / 字体 / 装饰图的时候看这份。
> 基础操作见 [README.md](README.md)，字段说明见 [CONTENT-GUIDE.md](CONTENT-GUIDE.md)。
>
> **一句话**：**颜色和尺寸**改 `source\css\xp-custom.css`；**图片和字体**放到
> `source\images\`、`source\fonts\`；**能用的素材全在下面这张清单里**，不用去别处找。

---

## 0. 先记住三条规则

1. **同一个设计变量，浅色和深色各写一份**——在 `xp-custom.css` 里 `:root { … }` 与 `html.dark { … }` 两处，**两处都要改**，否则深色模式会看不清。
2. **改 CSS 只要刷新页面**（`Ctrl + F5`）；**改图片、字体、`source\index.md` 要重新生成**（双击 `2 重新生成.cmd`）。
3. 颜色尽量**引用现成变量**（`var(--xp-blue-border)`），不要写死 `#888`——写死就不跟着深色模式走了。

---

## 1. 颜色旋钮（最常改的一批）

都在 `source\css\xp-custom.css` 最上面。左边是浅色（`:root`），右边是深色（`html.dark`）。

| 变量 | 管什么 | 浅色默认值 |
|---|---|---|
| `--xp-blue-border` | **窗体蓝边框、按钮边、标题栏主色、气泡边框** | `#0054e3` |
| `--xp-blue` / `--xp-blue-light` / `--xp-blue-dark` | 标题栏渐变的三个层次 | `#0058ee` / `#3590f3` / `#003399` |
| `--surface` | 窗口 / 卡片底色 | `#ffffff` |
| `--text` | 正文文字 | `#000000` |
| `--text-heading` | 标题文字 | `#003399` |
| `--text-muted` | 次要文字（日期、出处） | `#6b6b6b` |
| `--border` / `--border-strong` | 分隔线 / 加重的边 | `#d0cfbf` / `#a8a79a` |
| `--link` | 链接色 | `#0000ee` |
| `--face` / `--face-hover` / `--face-active` | 按钮的三种状态渐变 | 见文件 |
| `--title-grad` / `--taskbar-grad` / `--tray-grad` | 标题栏 / 任务栏 / 托盘的渐变 | 见文件 |
| `--win-shadow` / `--win-shadow-hover` | 窗口阴影 | 见文件 |
| `--desktop-bg` | 桌面壁纸（指向图片文件） | `xp-desktop-bg.jpg` |
| `--decor-left` / `--decor-right` | 两侧装饰图 | `decor/left.png`、`right.png` |
| `--taskbar-height` | 底部任务栏高度 | `36px` |

> **快速换个主题色**：把 `--xp-blue-border` 在新旧两处都改成你喜欢的颜色，
> 窗体、按钮、气泡的边框会一起变。

---

## 2. 字体

| 项目 | 情况 |
|---|---|
| 手写体 | **Caveat**，自托管在 `source\fonts\caveat-latin.woff2`（约 73 KB，SIL OFL 1.1 许可，可自由使用） |
| 只含什么 | **只有拉丁字母**；中文没有字形，会自动回落到系统字体（`KaiTi` 楷体 / `STKaiti` / `Microsoft YaHei`），所以中文显示为楷体 |
| 用在哪些地方 | 首页大标题的网名、侧栏用户名、攻略标题等（搜 `font-family: "Caveat"`） |
| 正文字体 | `Tahoma` → `Microsoft YaHei` → `PingFang SC`（系统自带，不需要素材） |
| 想换手写体 | 1) 把新字体（`.woff2`）覆盖到 `source\fonts\caveat-latin.woff2`；2) 改 `xp-custom.css` 第 0 节 `@font-face` 的 family 名与 `unicode-range`；3) 全站搜 `"Caveat"` 一并替换 |

**免费字体去哪找**：<https://fonts.google.com>（注意许可证）、<https://www.fontsquirrel.com>、
中文手写体可从「站酷字体」等免费商用字库获取。
**体积提醒**：中文字体动辄 5–20 MB，**不要**把中文字体塞进仓库——手机用户会很难受；
想用就只放你真正需要的那几个字，或继续用系统楷体。

---

## 3. 图片素材（全部放在 `source\images\`）

| 文件 | 用途 | 建议尺寸 | 换法 |
|---|---|---|---|
| `site-avatar.png` | 首页大头像 + 侧栏头像 | 正方形 256×256 | **覆盖同名文件** |
| `xp-desktop-bg.jpg` | **浅色**壁纸 | ≤1920×1080 | 覆盖同名文件 |
| `xp-desktop-bg-dark.jpg` | **深色**壁纸 | 同上 | 覆盖同名文件 |
| `decor\left.png`、`decor\right.png` | 页面左右留白区的装饰图（**窗口 ≥1500px 才显示**） | 竖长条，png/gif/webp/jpg 都行，**支持动图** | 放进 `decor\` 并保持文件名 |
| `works\<名字>.jpg` + `works\<名字>-thumb.jpg` | 作品大图 + 卡片缩略图 | 长边 1200 / 480 | 双击用 `tools\add-artwork.py` 自动生成 |
| `favicon.ico` | 浏览器标签页小图标 | 32×32 或 48×48 | 覆盖 `source\favicon.ico` |

> ⚠️ **头像不要改名成 `avatar.png`** —— 那是主题自带的占位图，主题资源后写入会把它盖掉。

**免费图片/图案去哪找**：
- 像素风背景：<https://www.pexels.com>、<https://unsplash.com>（免费可商用，注意各站许可）
- 像素图案与素材：<https://opengameart.org>、<https://itch.io/game-assets/free>
- 图标：<https://iconify.design>、<https://www.iconfont.cn>（阿里，中文站，可下载 SVG）
- 自己画：任何绘图软件导出 PNG/JPG 都行

---

## 4. 图标

| 情况 | 说明 |
|---|---|
| 首页社交图标（GitHub / 邮箱 / B站…） | **内联 SVG，写在页面里**，不用素材文件。要加平台就是在 `source\index.md` 里加一段 `<symbol>` 与对应链接（属于改代码，可交给 AI） |
| 游戏页 / 攻略页的图标 | 同样是**每个页面里各自定义的** `<symbol id="icon-xxx">`。**跨页不通用**：`/games/` 的图标不能在 `/guides/` 用 |
| 主题自带图标字体 | `themes\minimalism\source\fonts\iconfont.*`（页脚/导航在用）。**一般不用动**，改了要能看懂 styl 文件 |
| 想加一个新图标 | 从 iconfont 下载 SVG 后，按页面里现有 `<symbol>` 的写法粘贴进去，然后在 `apps.yml` / `guides.yml` 的 `icon:` 里引用它 |

---

## 5. 那几个「大件」素材与库

| 项目 | 位置 | 说明 |
|---|---|---|
| APlayer 音乐播放器 | `source\vendor\aplayer\APlayer.min.js` + `.css` | **已自托管**，页面不请求第三方 CDN。升级就覆盖这两个文件 |
| 播放器皮肤 | 同上 `.css` | 想改播放器外观从它入手（属于改第三方库，进阶） |
| XP 窗口 / 按钮 / 便当格 | `xp-custom.css` 第 4～6 节 | 全站视觉的唯一真源 |

---

## 6. 想大改版式的话

| 目标 | 该动的地方 |
|---|---|
| 首页格子怎么排 | `source\index.md` 顶部/末尾的 `<style>` 网格规则（12 栏 × 96px 行高） |
| 窗口外壳（标题栏、两栏比例、侧栏） | `themes\minimalism\layout\*.ejs` 与 `xp-custom.css` 第 10 节 |
| 侧栏放哪些卡片 | `themes\minimalism\layout\includes\xp-aside.ejs` |
| 新增一个组件 | 样式写进 `xp-custom.css`（用 `--变量` 和 `html.dark` 分支），**不要**在页面里写内联样式 |

改这些属于「改代码」。**最省事的办法**：把这份文档 + [MAINTENANCE.md](MAINTENANCE.md) 一起发给 AI，说明你想改成什么样。

---

*最后更新：2026-10 · 素材清单按仓库实际文件核对过；新增素材后记得回来补一行。*
