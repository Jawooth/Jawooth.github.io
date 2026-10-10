/**
 * Hexo 注入脚本：站点样式
 *
 * 历史与现状：
 * 1. 不再引入 https://unpkg.com/xp.css（全站没有 XP.css 原生类名，属纯阻塞的未锁版本依赖）。
 *    本站 XP 视觉全部由 /css/xp-custom.css 实现（灵感来自 XP.css，但不依赖它）。
 * 2. 不引入 Google Fonts：正文像素字体「方舟像素 12px」已自托管到
 *    source/fonts/ark-pixel-12px-zh_hans.woff2（OFL-1.1），@font-face 写在
 *    xp-custom.css 第 0 节，页面不再向外发起字体请求。
 *    强调文字（用户名/卡片标题）用同一套字体的「点阵粗体」实现，不额外加载文件。
 *    原先的 Google Fonts 请求（Caveat、VT323）都已去掉。
 */

hexo.extend.injector.register('head_end', `
  <!-- 本站 XP 风格设计系统（字体 @font-face 自托管，见该文件第 0 节） -->
  <link rel="stylesheet" href="/css/xp-custom.css">
`, 'default');
