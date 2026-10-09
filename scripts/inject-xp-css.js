/**
 * Hexo 注入脚本：字体与站点样式
 *
 * 说明（与旧版的差异）：
 * 1. 移除了 https://unpkg.com/xp.css 的引入。全站没有任何 XP.css 原生类名
 *    （title-bar / field-row / sunken-panel / status-bar / progress-indicators…），
 *    该请求属于纯阻塞、且未锁版本的第三方依赖。
 *    本站的 XP 视觉全部由 /css/xp-custom.css 实现（灵感来自 XP.css，但不依赖它）。
 * 2. 字体统一在 <head> 用 <link> 引入，不再在 CSS 里用 @import（@import 会串行阻塞）。
 *    - Caveat：手写体标题
 *    - VT323：播放器等数字屏显
 *    - 移除了全站从未使用的 Press Start 2P
 *    如面向大陆网络，建议后续把这几个字体自托管到 /fonts 下（届时删掉下面的 link 即可）。
 */

hexo.extend.injector.register('head_end', `
  <!-- 字体：手写体 + 像素屏显体 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=VT323&display=swap" rel="stylesheet">

  <!-- 本站 XP 风格设计系统 -->
  <link rel="stylesheet" href="/css/xp-custom.css">
`, 'default');
