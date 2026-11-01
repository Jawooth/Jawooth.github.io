# XP.css（自托管副本）

本站所有页面都通过 `scripts/inject-xp-css.js` 在 `<head>` 里引入本目录的 `XP.css`。

## 来源与版本

| 项 | 值 |
| --- | --- |
| 上游项目 | https://github.com/botoxparty/XP.css |
| 在线文档 | https://botoxparty.github.io/XP.css/ |
| 版本 | **0.3.0**（钉死，不跟随 npm 范围） |
| npm 包 | `xp.css@0.3.0` |
| 获取方式 | `npm pack xp.css@0.3.0` → 取 `package/dist/` 下的文件 |
| npm integrity | `sha512-+J2RkwXfJsTjoJO0VDz4F4Wqan7tvkxjRArAjmMWAqrlZ775zyEhq1nVRNcPgka0aq9sXQWY3Tc3MvwDerfzxg==` |
| 授权 | MIT，Copyright 2020 Adam Hammad, Jordan Scales —— 原件见同目录 `LICENSE`（MIT 要求随附） |

## 目录内容

| 文件 | 说明 |
| --- | --- |
| `XP.css` | 上游 `dist/XP.css`，压缩版，约 212 KB（体积大头是图标内联成 data: URI 的 SVG，gzip 后约 30 KB） |
| `ms_sans_serif.woff2` / `.woff` | XP.css 自带的像素西文字体（@font-face 相对路径引用，必须与 XP.css 同目录） |
| `ms_sans_serif_bold.woff2` / `.woff` | 同上，粗体 |
| `PerfectDOSVGA437Win.woff2` / `.woff` | XP.css 给 `pre` 用的 DOS 字体 |
| `LICENSE` | 上游 MIT 许可证原件 |

## 对上游文件做过的唯一改动

`XP.css` 末尾的 `/*# sourceMappingURL=XP.css.map */` 一行被替换成中文注释。

- 原因：本站不发布 `.map`（上游那份 44 KB，只在开 devtools 时有意义），留着这行会让浏览器去请求一个不存在的 `/vendor/xp-css/XP.css.map`。
- 影响：仅此一行，其余字节与上游 `xp.css@0.3.0/dist/XP.css` 完全一致（引入前 sha256 = `f266483d222a4c1f4db31b35942ea44a104f34e98da2d27bc82afd88fdfd1815`）。
- 想核对：删掉本注释行后再跑一次 sha256，应等于上面的值。

## 升级步骤

1. `npm pack xp.css@<新版本>`，解包取 `dist/`。
2. 覆盖本目录（保留本 README 与 `LICENSE`），重新做上面那一行改动。
3. `npm run build`，然后**逐页**看这四类元素有没有走样（它们是 XP.css 用元素选择器接管、最容易把本站视觉改掉的）：
   窗体控件（`button` / `input` / `select` / `label`）、`pre` / `code`、`h1`~`h4`、滚动条。
   对应的压回规则在 `source/css/xp-custom.css` 第 15 节「XP.css 兼容层」。
4. 跑 `py -3 tools\check\verify-site.py`。

## 为什么不做成 npm 依赖

跟本站其它前端资源（APlayer）一样：npm 依赖装在 `node_modules/`，`hexo generate` 不会把它复制进 `public/`，线上取不到。自持副本才能保证「今天能跑，明年还能跑」。
