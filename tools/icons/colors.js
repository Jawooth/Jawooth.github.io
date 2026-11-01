// 配色表：自动管线 57 个图标的区域 → PALETTE 色键映射
// 规则：A/B/C… = 描边连通域（按面积降序），a/b/c… = 内部封闭域
// 值 = scripts/xp-icons.js PALETTE 的 18 键之一（w W s S g G y Y o O r R b B e E h c C）
// '*' = 该图标未列出的其余区域兜底；键不存在时 emit 告警并置 '.'
module.exports = {
  /* ── 核心窗口/页面图标 ── */
  'icon-clipboard': { A: 'y', B: 'g', C: 'G', a: 's', b: 'w', D: 'G', '*': 'g' },
  'icon-post':      { A: 'b', B: 'b', C: 'b', D: 'b', E: 'b', F: 'B', a: 's', G: 'B', '*': 'b' },
  'icon-tag':       { A: 'g', B: 'y', C: 'Y', a: 'y', b: 'w', '*': 'y' },
  'icon-chart':     { A: 'e', B: 'g', C: 'g', D: 'g', E: 'g', a: 'w', '*': 'g' },
  'icon-compass':   { A: 'r', B: 'b', C: 'B', D: 'g', E: 'g', F: 'b', G: 'b', a: 'w', b: 'w', '*': 'w' },
  'icon-search':    { A: 'b', B: 'b', C: 'b', D: 'b', E: 'b', F: 'b', G: 'b', H: 'b', a: 'w', '*': 'w' },
  'icon-clock':     { A: 'r', B: 'g', C: 'g', D: 'g', E: 'g', a: 'w', '*': 'w' },
  'icon-image':     { A: 'b', B: 'b', C: 'e', D: 'b', E: 'y', F: 'e', G: 'y', H: 'e', a: 'c', b: 'e', '*': 'c' },

  /* ── 导航 ── */
  'nav-home':      { A: 'r', B: 'r', C: 'r', D: 'r', E: 'c', a: 'w', b: 'b', '*': 'r' },
  'nav-guides':    { A: 'o', a: 's', b: 's', '*': 'o' },
  'nav-archives':  { A: 'b', a: 'w', b: 'c', '*': 'b' },
  'nav-thanks':    { A: 'r', a: 'o', '*': 'r' },
  'nav-folder':    { A: 'y', B: 'y', C: 'y', D: 'y', E: 'y', a: 's', '*': 'y' },

  /* ── 托盘 ── */
  'tray-start':   { A: 'b', B: 'g', C: 'g', '*': 'b' },
  'tray-vol-on':  { A: 'b', '*': 'b' },
  'tray-vol-off': { A: 'r', '*': 'r' },
  'tray-sun':     { A: 'y', a: 'w', '*': 'y' },
  'tray-moon':    { A: 'y', B: 'y', C: 'y', D: 'y', E: 'y', F: 'y', G: 'y', a: 'w', '*': 'y' },
  'tray-power':   { A: 'r', B: 'r', C: 'g', D: 'g', '*': 'r' },

  /* ── 媒体播放器 ── */
  'icon-media-note':     { A: 'b', B: 'b', C: 'b', D: 'b', E: 'b', F: 'b', a: 's', b: 'w', '*': 'b' },
  'icon-media-prev':     { A: 'b', '*': 'b' },
  'icon-media-play':     { A: 'e', a: 'w', '*': 'e' },
  'icon-media-pause':    { A: 'b', B: 'b', a: 'c', b: 'c', '*': 'b' },
  'icon-media-next':     { A: 'b', '*': 'b' },
  'icon-media-list':     { A: 'b', B: 'g', '*': 'b' },
  'icon-media-link':     { A: 'c', B: 'c', C: 'c', D: 'c', E: 'c', a: 'w', '*': 'c' },
  'icon-media-expand':   { A: 'g', '*': 'g' },
  'icon-media-collapse': { A: 'g', '*': 'g' },
  'icon-media-eye':      { A: 'b', B: 'w', C: 'w', D: 'b', E: 'b', a: 'w', b: 'c', c: 'c', '*': 'b' },

  /* ── 通用 ── */
  'icon-lock':      { A: 'G', a: 'w', b: 'G', '*': 'G' },
  'icon-calendar':  { A: 'r', a: 'w', b: 'c', '*': 'r' },
  'icon-arrow-left':  { A: 'g', '*': 'g' },
  'icon-arrow-right': { A: 'g', '*': 'g' },
  'icon-copy':      { A: 'g', B: 'g', C: 'b', D: 'b', E: 'b', F: 'b', a: 'w', b: 'w', '*': 'g' },
  'icon-warn':      { A: 'r', B: 'y', C: 'y', D: 'y', E: 'r', a: 'y', b: 'y', '*': 'y' },
  'icon-critical':  { A: 'r', B: 'R', C: 'R', D: 'r', E: 'R', a: 'y', '*': 'r' },
  'icon-menu':      { A: 'g', B: 'g', C: 'g', '*': 'g' },
  'icon-close':     { A: 'G', '*': 'G' },
  'icon-like-off':  { A: 'G', a: 'w', '*': 'w' },
  'icon-like-on':   { A: 'r', a: 'o', '*': 'r' },
  'icon-pin':       { A: 'r', B: 'w', C: 'w', D: 'w', E: 'w', a: 'r', b: 'o', '*': 'r' },
  'icon-fallback':  { A: 'G', B: 'g', C: 'g', D: 'g', E: 'g', a: 'w', b: 'w', '*': 'w' },
  'icon-user':      { A: 'o', B: 'b', C: 'o', D: 'o', E: 'o', F: 'o', a: 's', '*': 'o' },
  'icon-calc':      { A: 'g', a: 'w', b: 'e', c: 'y', d: 'r', '*': 'g' },
  'icon-notepad':   { A: 'b', B: 'y', C: 'y', a: 'w', b: 's', '*': 'w' },

  /* ── guides 页卡片（apps.yml 引用） ── */
  'icon-game-guide': { A: 'g', B: 'g', C: 'g', D: 'g', E: 'r', a: 'w', '*': 'g' },
  'icon-art-guide':  { A: 'g', B: 'g', C: 'g', D: 'y', E: 'y', F: 'e', a: 's', b: 'c', c: 'o', '*': 'g' },
  'icon-tech-guide': { A: 'e', a: 'o', '*': 'e' },
  'icon-bulb':       { A: 'y', B: 'y', C: 'y', a: 'w', '*': 'y' },

  /* ── social ── */
  'icon-social-github':    { A: 'W', a: 'w', '*': 'W' },
  'icon-social-email':     { A: 'b', B: 'b', C: 'b', D: 'b', E: 'y', F: 'b', G: 'b', H: 'b', I: 'b', a: 'w', '*': 'b' },
  'icon-social-bilibili':  { A: 'c', a: 'w', '*': 'c' },
  'icon-social-pixiv':     { A: 'b', B: 'b', C: 'b', a: 'c', '*': 'c' },
  'icon-social-web':       { A: 'b', B: 'b', C: 'b', D: 'b', E: 'b', F: 'b', G: 'b', a: 'c', b: 'w', '*': 'b' },
  'icon-social-bluesky':   { A: 'c', a: 'w', b: 'c', '*': 'c' },
  'icon-social-twitter':   { A: 'b', a: 'c', '*': 'b' },
  'icon-todo-doing':       { A: 'y', B: 'y', C: 'y', D: 'y', a: 'w', '*': 'y' },
};
