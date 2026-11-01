// 单个大图渲染：8x 放大便于审查
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { GLYPHS, PALETTE } = require('../../scripts/xp-icons.js');

const IDS = process.argv.slice(2).filter(i => GLYPHS[i]);
const SCALE = 10, PAD = 6;
const CELL = 16 * SCALE;
const COLS = Math.min(4, IDS.length), ROWS = Math.ceil(IDS.length / COLS);
const W = COLS * (CELL + PAD) + PAD, H = ROWS * (CELL + PAD) + PAD;

const img = Buffer.alloc(W * H * 4);
function px(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4; img[i] = r; img[i + 1] = g; img[i + 2] = b; img[i + 3] = 255;
}
function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); }
rect(0, 0, W, H, [255, 255, 255]);

IDS.forEach((id, i) => {
  const col = i % COLS, row = (i / COLS) | 0;
  const ox = PAD + col * (CELL + PAD), oy = PAD + row * (CELL + PAD);
  const rows = GLYPHS[id].trim().split('\n').map(r => r.trim());
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ch = (rows[y] || '')[x] || '.';
    if (ch === '.') continue;
    rect(ox + x * SCALE, oy + y * SCALE, SCALE, SCALE, hex2rgb(PALETTE[ch]));
  }
});

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
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  img.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, 'zoom.png');
fs.writeFileSync(out, png);
console.log('written', out, IDS.join(','));
