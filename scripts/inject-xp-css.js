/**
 * Hexo 注入脚本：站点样式
 *
 * 历史与现状：
 * 1. 不再引入 https://unpkg.com/xp.css（全站没有 XP.css 原生类名，属纯阻塞的未锁版本依赖）。
 *    本站 XP 视觉全部由 /css/xp-custom.css 实现（灵感来自 XP.css，但不依赖它）。
 * 2. 不引入 Google Fonts：手写体 Caveat 已自托管到 source/fonts/caveat-latin.woff2，
 *    @font-face 写在 xp-custom.css 第 0 节，页面不再向外发起字体请求。
 *    原先一起请求的 VT323 全站从未使用，已一并去掉。
 */

hexo.extend.injector.register('head_end', `
  <!-- 本站 XP 风格设计系统（字体 @font-face 自托管，见该文件第 0 节） -->
  <link rel="stylesheet" href="/css/xp-custom.css">
`, 'default');
