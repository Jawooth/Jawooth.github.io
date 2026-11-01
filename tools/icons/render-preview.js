// 零依赖：渲染若干图标为 PNG 网格图（手写 PNG encoder，无压缩 zlib stored 块）
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { GLYPHS } = require('../../scripts/xp-icons.js');

const IDS = [
  'icon-clipboard', 'icon-tag', 'icon-chart', 'icon-compass', 'icon-search', 'icon-clock',
  'nav-home', 'nav-guides', 'nav-folder', 'icon-gamepad', 'icon-wrench', 'icon-pencil',
  'icon-brick', 'icon-snake', 'icon-puzzle', 'icon-calc', 'icon-notepad', 'icon-palette',
  'icon-like-on', 'icon-todo-done', 'icon-todo-doing', 'icon-todo-pending', 'icon-pin',
  'icon-social-github', 'icon-social-bilibili', 'icon-social-x', 'icon-social-redbook',
  'icon-social-rss', 'icon-social-weibo', 'icon-social-zhihu', 'icon-media-dice',
  'icon-book', 'icon-bulb', 'icon-warn', 'icon-critical', 'icon-media-play',
];
const KEYS = IDS.filter(id => GLYPHS[id]);

// PALETTE 直接取导出值
const { PALETTE } = require('../../scripts/xp-icons.js');

const SCALE = 4, CELL = 16 * SCALE, PAD = 8, LBL = 14;
const COLS = 6, ROWS = Math.ceil(KEYS.length / COLS);
const W = COLS * (CELL + PAD) + PAD, H = ROWS * (CELL + PAD + LBL) + PAD;

// RGBA 缓冲
const img = Buffer.alloc(W * H * 4);
function px(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  img[i] = r; img[i + 1] = g; img[i + 2] = b; img[i + 3] = 255;
}
function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); }
// 5x7 迷你字体只画 id 前缀太复杂 → 用简单文本省略，画序号方点代替
function dot(x, y, c) { rect(x, y, 2, 2, c); }

// 背景
rect(0, 0, W, H, [244, 244, 244]);

KEYS.forEach((id, i) => {
  const col = i % COLS, row = (i / COLS) | 0;
  const ox = PAD + col * (CELL + PAD), oy = PAD + row * (CELL + PAD + LBL);
  const rows = GLYPHS[id].trim().split('\n').map(r => r.trim());
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ch = (rows[y] || '')[x] || '.';
    if (ch === '.') continue;
    const key = PALETTE[ch];
    if (!key) { console.log('unknown key', ch, 'in', id); continue; }
    rect(ox + x * SCALE, oy + y * SCALE, SCALE, SCALE, hex2rgb(key));
  }
  // 标签：序号点阵（i+1 的二进制点）
  let n = i + 1;
  for (let b = 0; b < 6; b++) { if (n & (1 << b)) dot(ox + b * 4, oy + CELL + 4, [90, 90, 90]); }
});

// PNG 编码（zlib stored）
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcTable = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  let crc = 0xffffffff;
  for (const b of Buffer.concat([t, data])) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  crc = (crc ^ 0xffffffff) >>> 0;
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc);
  return Buffer.concat([len, t, data, cb]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  img.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, 'preview.png');
fs.writeFileSync(out, png);
console.log('written', out, `${KEYS.length} icons, ${W}x${H}`);
