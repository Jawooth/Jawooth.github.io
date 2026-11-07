/* global hexo */
/**
 * 全站图标的「画的真源」（v4：IconPark 平滑多色矢量，48×48 viewBox 空间）。
 *
 * 为什么独立成模块：
 *   同一批图标要在三处输出 ——
 *     ① 窗口标题小图标（scripts/xp-enhance.js 的 ICON_SPRITE，after_render 按页裁剪注入）
 *     ② 导航图标（scripts/xp-taskbar.js 的 START_ICONS：任务栏当前页 + 开始菜单 + 首页瓦片
 *        + 托盘四件：开始按钮/音量/日夜/关机）
 *     ③ 分类/标签页标题（xp_pixel_rects tag，页面手写内联 SVG 借图）
 *   三处共用同一份画，改一处三处同步。
 *
 * 数据形态（2026-10-31 起，m01919 用户决策：放弃像素化，应用平滑多色）：
 *   GLYPHS[id] = IconPark (Apache 2.0) 原始 SVG body 字符串（48×48 空间），
 *   经 tools/icons/park-recolor.js 的 18 键 TINT 重着色（多色），无色 body（github）
 *   包 <g fill=主色>。贝塞尔曲线原样保留（平滑渲染，无浮雕/无像素化）。
 *
 * 用法：
 *   const { pixelSymbol, pixelGlyph } = require('./xp-icons');
 *   pixelSymbol('icon-tag')  → '<symbol id viewBox="0 0 16 16"><g transform="scale(1/3)">…path…</g></symbol>'
 *   pixelGlyph('icon-tag')   → '<g transform="scale(1/3)">…path…</g>'（START_ICONS / 托盘 / data-URI 用）
 *   外层 16×16 viewBox 壳全站通用（14 处硬编码零改动），scale(1/3) 把 48 空间缩到 16。
 *
 * 再生成：改 park-map.js（语义映射）/ park-recolor.js（TINT 配色）→ node tools/icons/emit-smooth.js
 *         → node tools/icons/merge-smooth-xp-icons.js
 * 旧像素版（pixelarticons 点阵 + tools/icons/colorize.js 上色那一代）已删除：
 *   2026-11-06 站主确认去掉 pixelarticons 依赖，那条管线（decode-pixelarticons /
 *   colorize / review-decode / merge-xp-icons / generated-glyphs / hand-drawn）随之整组删掉。
 *   它要读 node_modules/pixelarticons/svg，而产物在 2026-10-31 换成平滑多色之后就再没被读过。
 */
/* ---------------- 全站像素色板（v3：9 色相 × 亮/暗，零黑色描边） ---------------- */
const PALETTE = {
  w: '#ffffff',  // 白（纸面 / 高光主体）
  W: '#cfd8e3',  // 冷白暗阶
  s: '#f7f0dd',  // 米纸（暖白主体）
  S: '#b9ac8b',  // 米纸暗阶
  g: '#dde3ec',  // 银灰（亮金属）
  G: '#6b7480',  // 银灰暗阶
  y: '#ffd24a',  // 黄（主体）
  Y: '#b9790a',  // 黄暗阶
  o: '#f79240',  // 橙（主体）
  O: '#96470c',  // 橙暗阶
  r: '#ef5b52',  // 红（主体）
  R: '#8f241d',  // 红暗阶
  b: '#4a86e8',  // 蓝（主体）
  B: '#1c3a70',  // 蓝暗阶
  e: '#55b463',  // 绿（主体）
  E: '#1e5c27',  // 绿暗阶
  h: '#4a9e5c',  // 中绿（画中的远山，介于 e/E 之间）
  c: '#9fd8f8',  // 天蓝亮
  C: '#2f7fb8',  // 天蓝暗阶
};

/* ---------------- 方案六 · Win95 立体浮雕（唯一视觉方向）----------------
 * 点阵本身只画「纯色块」：不带任何亮/暗阶对，明暗 100% 由这里生成。
 * 算法（M4，2026-10-30 定稿）：
 *   ① 边缘 E = 四邻有透明的格（剪影边界，不按色分别勾边，否则内部碎裂）。
 *   ② E 上的格   → 压暗 30%（轮廓，深浅底都能看见）。
 *   ③ 非 E、但上/左邻在 E 上 → 提亮 30%（受光面）。
 *   ④ 非 E、但下/右邻在 E 上 → 压暗 22.5%（背光面）。
 *   ⑤ 其余格保持不变。
 * 不新增任何像素，所以不会「出盒」，也不会让轮廓断裂。 */
const BEVEL = { edge: -0.30, lit: 0.30, shade: -0.225 };

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const r = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(r)));
  });
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ASCII 点阵 → 16×16 的色值矩阵（'.' 为 null）。做尺寸与色键校验。 */
function grid(art) {
  const rows = art.split('\n').map((r) => r.trim()).filter(Boolean);
  if (rows.length !== 16) throw new Error(`xp-icons: 图案高 ${rows.length} ≠ 16`);
  return rows.map((row, y) => {
    if (row.length !== 16) throw new Error(`xp-icons: 图案宽 ${row.length} ≠ 16（行 ${y + 1}）`);
    return [...row].map((ch, x) => {
      if (ch === '.' || ch === ' ') return null;
      const color = PALETTE[ch];
      if (!color) throw new Error(`xp-icons: 未知色键 "${ch}"（行 ${y + 1} 列 ${x + 1}）`);
      return color;
    });
  });
}

/* 给纯色块矩阵叠上 M4 浮雕，返回新的色值矩阵。 */
function bevelGrid(g) {
  const at = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15 ? null : g[y][x]);
  const isEdge = (x, y) => g[y][x] !== null && [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((v) => v === null);
  return g.map((line, y) => line.map((c, x) => {
    if (c === null) return null;
    if (isEdge(x, y)) return shadeHex(c, BEVEL.edge);
    const lit = isEdge(x - 1, y) || isEdge(x, y - 1);
    const dark = isEdge(x + 1, y) || isEdge(x, y + 1);
    if (lit && !dark) return shadeHex(c, BEVEL.lit);
    if (dark && !lit) return shadeHex(c, BEVEL.shade);
    return c;
  }));
}

/* 把 ASCII 点阵转成 <rect> 串。先叠浮雕，再把相邻同色格横向合并成一条 rect。 */
function rects(art) {
  const g = bevelGrid(grid(art));
  const out = [];
  for (let y = 0; y < 16; y++) {
    let x = 0;
    while (x < 16) {
      const color = g[y][x];
      if (color === null) { x++; continue; }
      let w = 1;
      while (x + w < 16 && g[y][x + w] === color) w++;
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${color}"/>`);
      x += w;
    }
  }
  return out.join('');
}

/* 输出完整 <symbol>。GLYPHS 值是 IconPark SVG body（viewBox 0 0 48 48 空间，18 键色板
   重着色后的平滑多色矢量），包 <g transform="scale(1/3)"> 适配全站 viewBox="0 0 16 16" 壳
   （xp-taskbar / xp-window-title / xp_pixel_rects / data-URI 共 14 处硬编码，零改动）。 */
const SMOOTH_SCALE = 1 / 3;
function pixelSymbol(id, art) {
  const body = art || GLYPHS[id];
  if (!body) throw new Error(`xp-icons: 没有图案 "${id}"`);
  return `<symbol id="${id}" viewBox="0 0 16 16"><g transform="scale(${SMOOTH_SCALE})">${body}</g></symbol>`;
}

/* 只输出填充内容（给 xp-taskbar.js 的 START_ICONS / xp_pixel_rects 用）。 */
function pixelGlyph(id) {
  const body = GLYPHS[id];
  if (!body) return '';
  return `<g transform="scale(${SMOOTH_SCALE})">${body}</g>`;
}

/* ---------------- 图案库（v4：IconPark 平滑多色） ----------------
   值 = IconPark (Apache 2.0) 原始 SVG body（48×48 空间）经 park-recolor.js 的
   18 键 TINT 重着色后的字符串；无色 body（github）包 <g fill=主色>。
   真源与生成：tools/icons/park-map.js（语义映射）+ park-recolor.js（配色）
   + emit-smooth.js（落库数据）→ tools/icons/smooth-glyphs.js → 本文件。
   视觉：平滑贝塞尔曲线 + 多色填充，无浮雕、无像素化。 */
const SMOOTH_GLYPHS = require('../tools/icons/smooth-glyphs.js');
const GLYPHS = SMOOTH_GLYPHS;

module.exports = { pixelSymbol, pixelGlyph, GLYPHS, PALETTE };
