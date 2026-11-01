// IconPark → 16×16 GLYPHS 全量管线：重着色 → 光栅化 → 色板键 ASCII
// 输出：tools/icons/park-glyphs.txt（审查用 ASCII 表）+ park-glyphs.js（GLYPHS 对象，供预览/合并）
const fs = require('fs');
const path = require('path');
const { rasterizePark, gridToAscii16, park, nearestKey } = require('./decode-iconpark.js');
const { recolor, TINT, STROKE_DARK } = require('./park-recolor.js');
const MAP = require('./park-map.js');

const VALID_KEYS = new Set('wWsSgGyYoOrRbBeEh cC'.replace(/ /g, '').split(''));
const out = {};
const problems = [];
// 用户已决定弃用 social-x（twitter 顶替），TINT 表已删，跳过
const SKIP = new Set(['icon-social-x']);

for (const [id, entry] of Object.entries(MAP)) {
  if (SKIP.has(id)) continue;
  const [parkName] = entry;
  const icon = park.icons[parkName];
  if (!icon) { problems.push(`${id}: park 图标缺失 ${parkName}`); continue; }
  const tint = TINT[id];
  if (!tint) { problems.push(`${id}: TINT 无配色条目`); continue; }
  const body = recolor(icon.body, tint[0], tint[1]);
  let ascii;
  try {
    const grid = rasterizePark(body);
    // 漏网纯黑（源 SVG 无色值、靠默认黑填充）→ 按主色映射到暗阶，避免 nearestKey 乱配
    // 注意 nearestKey 只认 #rrggbb，纯黑 '#000' 会解析 NaN → '.'，所以在 ASCII 层替换
    const darkKey = STROKE_DARK[tint[0]] || 'G';
    ascii = gridToAscii16(grid).split('\n').map(row =>
      row.replace(new RegExp(nearestKey('#000'), 'g'), darkKey)
    ).join('\n');
  } catch (e) {
    problems.push(`${id}: 光栅化异常 ${e.message}`);
    continue;
  }
  // 校验
  const rows = ascii.split('\n');
  if (rows.length !== 16 || rows.some(r => r.length !== 16)) {
    problems.push(`${id}: 网格尺寸异常 ${rows.length}x${rows[0] && rows[0].length}`);
    continue;
  }
  const bad = new Set();
  for (const r of rows) for (const ch of r) if (ch !== '.' && !VALID_KEYS.has(ch)) bad.add(ch);
  if (bad.size) problems.push(`${id}: 非法色键 ${[...bad].join('')}`);
  const filled = rows.join('').replace(/\./g, '').length;
  if (filled < 12) problems.push(`${id}: 填充过少 ${filled} 格`);
  out[id] = ascii;
}

// ---- 审查文件 ----
const REVIEW_ORDER = Object.keys(MAP);
let txt = `IconPark 像素化审查表（${Object.keys(out).length}/${REVIEW_ORDER.length} 图标）\n`;
txt += `生成时间: ${new Date().toISOString()}\n\n`;
for (const id of REVIEW_ORDER) {
  const [parkName, use] = MAP[id];
  txt += `=== ${id} (park: ${parkName}) ${use ? '· ' + use : ''} ===\n`;
  txt += out[id] ? out[id] + '\n' : '(解码失败)\n';
  txt += '\n';
}
fs.writeFileSync(path.join(__dirname, 'park-glyphs.txt'), txt);

// ---- GLYPHS JS ----
const js = `// 由 tools/icons/park-pixel.js 自动生成 — IconPark (Apache 2.0) 重着色光栅化 16×16 点阵
// 请勿手改；重新生成：node tools/icons/park-pixel.js
const PARK_GLYPHS = {
${REVIEW_ORDER.filter(id => out[id]).map(id =>
  `  '${id}':\n    '${out[id].split('\n').join("\\n")}',`).join('\n')}
};
module.exports = { PARK_GLYPHS };
`;
fs.writeFileSync(path.join(__dirname, 'park-glyphs.js'), js);

console.log(`done: ${Object.keys(out).length}/${REVIEW_ORDER.length} icons rasterized`);
if (problems.length) {
  console.log('problems:');
  for (const p of problems) console.log('  - ' + p);
}
