/* 站标重生成（用户 m02437：站点图标与新正脸兔图标统一）：
 *  - source/favicon.ico：icon-user（rabbit 源，橙身白点 G 描边）16/32/48 三档 PNG 帧 ICO
 *  - source/images/site-mark.svg：同一只兔的平滑矢量版（直接包 rabbit body）
 * 与站内图标同源（tools/icons/smooth-glyphs.js 的 icon-user），以后换兔子只需重跑本脚本。
 * 依赖：node 内置 zlib 写 PNG；无需 Pillow/iconfont.ttf。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { rasterizePark, park, scaleGridHex } = (() => {
  const m = require('./decode-iconpark.js');
  return m;
})();
const { recolor } = require('./park-recolor.js');

/* ---- 1. 取得兔子网格（48 空间光栅化，色值=hex） ----
 * 数据源 = smooth-glyphs.js 的 icon-user（与站内窗口标题/开始菜单同一只兔），
 * lucide:rabbit 改造版（24 空间、scale(2) 包裹）→ rasterizePark 直接吃 SVG body。 */
const GLYPH = require('./smooth-glyphs.js')['icon-user'];
const grid48 = rasterizePark(GLYPH, 48); // 48×48 二维数组（hex 或 null）
const PALETTE = require('../../scripts/xp-icons.js').PALETTE;

/* ---- 2. 手写 PNG（RGBA，无依赖） ---- */
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- 3. 网格 → RGBA ---- */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function gridToRGBA(grid) {
  const n = grid.length;
  const rgba = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = grid[y][x];
    const o = (y * n + x) * 4;
    if (!v) { rgba[o + 3] = 0; continue; }
    const [r, g, b] = hexToRgb(v);
    rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255;
  }
  return rgba;
}
/* 48 → 16/32 盒滤波降采样（带 alpha 权重，避免透明格污染均值） */
function downsample(grid, to) {
  const from = grid.length;
  const k = from / to;
  const out = Array.from({ length: to }, () => new Array(to).fill(null));
  for (let y = 0; y < to; y++) for (let x = 0; x < to; x++) {
    // 该区域内出现次数最多的色（众数，保持像素干净不糊）
    const count = {};
    for (let yy = Math.floor(y * k); yy < Math.floor((y + 1) * k); yy++)
      for (let xx = Math.floor(x * k); xx < Math.floor((x + 1) * k); xx++) {
        const v = grid[yy][xx];
        if (v) count[v] = (count[v] || 0) + 1;
      }
    let best = null, bn = 0;
    for (const [v, n2] of Object.entries(count)) if (n2 > bn) { best = v; bn = n2; }
    out[y][x] = best;
  }
  return out;
}

/* ---- 4. 写 favicon.ico（PNG 帧） ---- */
function writeIco(sizes, grids) {
  const pngs = sizes.map((s) => encodePNG(s, gridToRGBA(grids[s])));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  const entries = [];
  let offset = 6 + sizes.length * 16;
  sizes.forEach((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    entries.push(e);
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

/* 16/32 帧直接按目标尺寸光栅化 SVG（线条粗细随尺寸自适应，比 48 众数降采样干净） */
const GLYPH_BODY = require('./smooth-glyphs.js')['icon-user'];
const g16 = rasterizePark(GLYPH_BODY, 16);
const g32 = rasterizePark(GLYPH_BODY, 32);
const ico = writeIco([16, 32, 48], { 16: g16, 32: g32, 48: grid48 });
fs.writeFileSync(path.join(__dirname, '../../source/favicon.ico'), ico);

/* ---- 5. site-mark.svg：平滑矢量兔（与站内 icon-user 同 body） ---- */
const body = require('./smooth-glyphs.js')['icon-user'];
const svg = (
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="站标">' +
  body + '</svg>\n'
);
fs.writeFileSync(path.join(__dirname, '../../source/images/site-mark.svg'), svg);

console.log('favicon.ico', fs.statSync(path.join(__dirname, '../../source/favicon.ico')).size, 'bytes (PNG frames 16/32/48)');
console.log('site-mark.svg', fs.statSync(path.join(__dirname, '../../source/images/site-mark.svg')).size, 'bytes (smooth vector rabbit)');
