// 解码全部所需源图标 → 12×12 → 洪泛填充内部 → 亮/暗双色 ASCII 审查表
// '#' = 描边(将映射暗阶) , 'o' = 内部(将映射亮阶)
const { decodeIcon, SVG_DIR } = require('./decode-pixelarticons');
const fs = require('fs');
const path = require('path');

// 站内所需 id → pixelarticons 源名 映射（初步，待审查后定稿）
const MAP = {
  // 核心 UI
  'icon-clipboard': 'clipboard', 'icon-post': 'notes', 'icon-tag': 'label',
  'icon-palette': 'colors-swatch', 'icon-chart': 'chart', 'icon-compass': 'compass',
  'icon-search': 'search', 'icon-pencil': 'pencil', 'icon-clock': 'clock',
  'icon-gamepad': 'gamepad', 'icon-wrench': 'tools', 'icon-image': 'image',
  // 导航
  'nav-home': 'home', 'nav-guides': 'book-open', 'nav-archives': 'archive',
  'nav-thanks': 'heart', 'nav-folder': 'folder',
  // 托盘/媒体
  'tray-start': 'menu', 'tray-vol-on': 'volume', 'tray-vol-off': 'volume-x',
  'tray-sun': 'sun', 'tray-moon': 'moon', 'tray-power': 'power',
  'icon-media-note': 'note', 'icon-media-prev': 'arrow-left', 'icon-media-play': 'play',
  'icon-media-pause': 'pause', 'icon-media-next': 'arrow-right', 'icon-media-dice': 'shuffle',
  'icon-media-list': 'bulletlist', 'icon-media-link': 'link', 'icon-media-expand': 'expand',
  'icon-media-collapse': 'collapse', 'icon-media-eye': 'eye',
  // 通用
  'icon-lock': 'lock', 'icon-calendar': 'calendar', 'icon-arrow-left': 'arrow-left',
  'icon-arrow-right': 'arrow-right', 'icon-copy': 'copy', 'icon-warn': 'warning-diamond',
  'icon-critical': 'square-alert', 'icon-menu': 'menu', 'icon-close': 'close',
  'icon-like-off': 'heart', 'icon-like-on': 'heart', 'icon-pin': 'map-pin',
  'icon-fallback': 'circle-question', 'icon-user': 'user',
  // 缺口 10 个
  'icon-brick': 'blocks', 'icon-snake': 'snake', 'icon-puzzle': 'puzzle',
  'icon-calc': 'calculator', 'icon-notepad': 'sticky-note', 'icon-book': 'book',
  'icon-game-guide': 'gamepad', 'icon-art-guide': 'colors-swatch', 'icon-tech-guide': 'cpu',
  'icon-bulb': 'lightbulb',
  // social
  'icon-social-github': 'github', 'icon-social-email': 'mail', 'icon-social-bilibili': 'tv',
  'icon-social-redbook': 'book', 'icon-social-x': 'x', 'icon-social-weibo': 'weibo',
  'icon-social-pixiv': 'pencil', 'icon-social-web': 'globe', 'icon-social-bluesky': 'bluesky',
  'icon-social-rss': 'rss', 'icon-social-twitter': 'twitter-bird', 'icon-social-facebook': 'facebook',
  'icon-social-zhihu': 'zhihu',
  // todo
  'icon-todo-done': 'check', 'icon-todo-doing': 'checkbox', 'icon-todo-pending': 'checkbox-blank',
};

// 洪泛：从边界 4 连通可达的透明区 = 外部；不可达透明区 = 内部洞
function markInteriors(g) {
  const N = 12;
  const seen = Array.from({ length: N }, () => new Array(N).fill(false));
  const q = [];
  for (let i = 0; i < N; i++) {
    if (!g[0][i]) { q.push([0, i]); seen[0][i] = true; }
    if (!g[N-1][i]) { q.push([N-1, i]); seen[N-1][i] = true; }
    if (!g[i][0]) { q.push([i, 0]); seen[i][0] = true; }
    if (!g[i][N-1]) { q.push([i, N-1]); seen[i][N-1] = true; }
  }
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < N && ny >= 0 && ny < N && !g[ny][nx] && !seen[ny][nx]) {
        seen[ny][nx] = true; q.push([nx, ny]);
      }
    }
  }
  // 输出：'#' 描边，'o' 内部洞（待填亮色），'.' 透明
  return g.map((row, y) => row.map((v, x) => v ? '#' : (seen[y][x] ? '.' : 'o')).join(''));
}

module.exports = { MAP, markInteriors };

const names = [...new Set(Object.values(MAP))];
const out = [];
const missing = [];
for (const n of names) {
  const g = decodeIcon(n);
  if (!g) { missing.push(n); continue; }
  out.push('=== ' + n + ' ===');
  out.push(markInteriors(g).join('\n').replaceAll(',', '\n'));
}
fs.writeFileSync(path.join(__dirname, 'review.txt'), out.join('\n') + '\n');
console.log('decoded:', names.length - missing.length, '/', names.length);
console.log('MISSING:', missing.join(', '));
