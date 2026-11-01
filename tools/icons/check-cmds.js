// 诊断：检查所需源图标的 path 指令集（是否含 L 等未支持指令）
const { SVG_DIR } = require('./decode-pixelarticons');
const fs = require('fs');
const names = ['mail', 'folder', 'calendar', 'gamepad', 'image', 'lock', 'checkbox', 'copy',
  'archive', 'clipboard', 'chart', 'clock', 'compass', 'search', 'label', 'heart', 'snake',
  'bulletlist', 'twitter-bird', 'github', 'tv', 'x', 'pause', 'eye', 'sun', 'moon',
  'volume-x', 'warning-diamond', 'square-alert', 'circle-question', 'calculator',
  'book-open', 'notes', 'menu', 'close', 'check', 'volume', 'arrow-left', 'arrow-right'];
for (const n of names) {
  const svg = fs.readFileSync(`${SVG_DIR}/${n}.svg`, 'utf8');
  const m = svg.match(/ d="([^"]+)"/);
  if (!m) { console.log(n.padEnd(18), 'NO-D'); continue; }
  const cmds = [...new Set(m[1].match(/[A-Za-z]/g))].join('');
  console.log(n.padEnd(18), cmds);
}
