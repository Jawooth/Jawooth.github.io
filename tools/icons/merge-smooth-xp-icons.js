/* 把平滑多色方案合并进 scripts/xp-icons.js：
 * - 保留头部（注释/PALETTE/浮雕引擎函数），但 pixelSymbol/pixelGlyph 切换为平滑渲染
 * - GLYPHS 数据区整体替换为 require('./tools/icons/smooth-glyphs.js')
 * 用法：node tools/icons/merge-smooth-xp-icons.js [--check]
 */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '../../scripts/xp-icons.js');
const src = fs.readFileSync(TARGET, 'utf8');
const lines = src.split('\n');

// 定位引擎头结束（pixelGlyph 函数结束 = L130 附近，找 "/* ---------------- 图案库" 行）
const glyphLibIdx = lines.findIndex((l) => l.includes('---------------- 图案库'));
const exportIdx = lines.findIndex((l) => l.startsWith('module.exports'));
if (glyphLibIdx < 0 || exportIdx < 0) throw new Error('structure markers not found');
console.log('glyph lib header at line', glyphLibIdx + 1, '; exports at', exportIdx + 1);

// 新引擎函数（平滑版）：替换 L122-130 的 pixelSymbol/pixelGlyph
// 思路：GLYPHS 值 = SVG body（48 空间，recolor 多色）；渲染时包 scale(1/3) 适配全站 16×16 壳
const engineReplace = `/* 输出完整 <symbol>。GLYPHS 值是 IconPark SVG body（viewBox 0 0 48 48 空间，18 键色板
   重着色后的平滑多色矢量），包 <g transform="scale(1/3)"> 适配全站 viewBox="0 0 16 16" 壳
   （xp-taskbar / xp-window-title / xp_pixel_rects / data-URI 共 14 处硬编码，零改动）。 */
const SMOOTH_SCALE = 1 / 3;
function pixelSymbol(id, art) {
  const body = art || GLYPHS[id];
  if (!body) throw new Error(\`xp-icons: 没有图案 "\${id}"\`);
  return \`<symbol id="\${id}" viewBox="0 0 16 16"><g transform="scale(\${SMOOTH_SCALE})">\${body}</g></symbol>\`;
}

/* 只输出填充内容（给 xp-taskbar.js 的 START_ICONS / xp_pixel_rects 用）。 */
function pixelGlyph(id) {
  const body = GLYPHS[id];
  if (!body) return '';
  return \`<g transform="scale(\${SMOOTH_SCALE})">\${body}</g>\`;
}
`;

// 头部 = L1 到 pixelSymbol 定义前（找 "/* 输出完整 <symbol>" 行）
const symDefIdx = lines.findIndex((l) => l.includes('/* 输出完整 <symbol>'));
if (symDefIdx < 0) throw new Error('pixelSymbol marker not found');
const head = lines.slice(0, symDefIdx).join('\n');

const tail = `
/* ---------------- 图案库（v4：IconPark 平滑多色） ----------------
   值 = IconPark (Apache 2.0) 原始 SVG body（48×48 空间）经 park-recolor.js 的
   18 键 TINT 重着色后的字符串；无色 body（github）包 <g fill=主色>。
   真源与生成：tools/icons/park-map.js（语义映射）+ park-recolor.js（配色）
   + emit-smooth.js（落库数据）→ tools/icons/smooth-glyphs.js → 本文件。
   视觉：平滑贝塞尔曲线 + 多色填充，无浮雕、无像素化。 */
const SMOOTH_GLYPHS = require('../tools/icons/smooth-glyphs.js');
const GLYPHS = SMOOTH_GLYPHS;

module.exports = { pixelSymbol, pixelGlyph, GLYPHS, PALETTE };
`;

const out = head + '\n' + engineReplace + tail;
if (process.argv.includes('--check')) {
  console.log('check mode: would write', out.length, 'chars');
} else {
  fs.writeFileSync(TARGET, out);
  console.log('written scripts/xp-icons.js —', out.split('\n').length, 'lines');
}
