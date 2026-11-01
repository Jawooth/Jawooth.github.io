/**
 * Hexo 注入脚本：站点样式（全站所有页面）
 *
 * 注入顺序（很重要，后面的覆盖前面的）：
 *   1. /style/main.css        —— 主题自带样式（构建产物，来自 themes/minimalism/source/style/*.styl）
 *   2. /vendor/xp-css/XP.css  —— XP.css 官方库 v0.3.0（自托管，MIT）
 *   3. /css/xp-custom.css     —— 本站设计系统（唯一真源），负责覆盖上面两者
 *
 * 为什么把 XP.css 放在中间：
 *   XP.css 是**元素选择器**为主（body / button / input / pre / h1…），本站的视觉规则
 *   主要写在类选择器上（.xp-btn / .post-content h2…）。同级冲突时类选择器本来就赢，
 *   所以 XP.css 放在 xp-custom.css 前面最省事；真被 XP.css 抢走的少数规则
 *   （body 字号、表单控件字体、pre 背景、h1~h4 字号…）在 xp-custom.css 第 15 节
 *   「XP.css 兼容层」里逐条压回去，改那一节时必须连同原因一起写。
 *
 * 关于 XP.css 本身（2026-10-13 变更）：
 *   - 以前这里明确**不引入** XP.css，理由记在原注释里：当时全站没有任何 XP.css 原生类名，
 *     引进来只是一条阻塞渲染的未锁版本 CDN 依赖。现在改为引入，并且把那两条都解决了：
 *     ① 自托管到 source/vendor/xp-css/（版本钉死在 0.3.0，附 LICENSE 与来源说明），
 *        不再向 unpkg 发请求；② 站内开始真正使用 XP.css 的原生类名（.window / .title-bar /
 *        .field-row / .status-bar / ul.tree-view …），不再是纯摆设。
 *   - 字体：XP.css 自带的 ms_sans_serif / PerfectDOSVGA437Win 与它同目录部署，
 *     @font-face 里的相对 url() 不用改。它们只在 XP.css 自己的选择器上生效，
 *     本站正文依旧是自托管的缝合像素 12px（见 xp-custom.css 第 0 节）。
 */

const { XPIconCssVer } = require('./_xp-icon-css');

hexo.extend.injector.register('head_end', `
  <!-- XP.css v0.3.0（自托管，MIT，来源见 source/vendor/xp-css/README.md） -->
  <link rel="stylesheet" href="/vendor/xp-css/XP.css">
  <!-- 本站 XP 风格设计系统：覆盖上面两个文件，字体 @font-face 自托管（见该文件第 0 节） -->
  <link rel="stylesheet" href="/css/xp-custom.css">
  <!-- 点阵图标：把主题 iconfont 的 .icon-xxx 换成 xp-icons.js 生成的多色像素背景图。
       构建期算好 ?v=，图标改了版本号自动变，不会被浏览器缓存卡住。
       放在 xp-custom.css 之后，覆盖 fonts.styl 的字体字形。 -->
  <link rel="stylesheet" href="/css/xp-icons.css?v=${XPIconCssVer}">
`, 'default');
