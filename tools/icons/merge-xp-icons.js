// 合并：generated-glyphs.js + hand-drawn.js → scripts/xp-icons.js
// 保留 xp-icons.js 的引擎头（PALETTE/BEVEL/工具函数，到 `const GLYPHS = {};` 为止）
// 与结尾的 module.exports，中间的 GLYPHS 定义全部替换为新一代点阵。
// 用法：node tools/icons/merge-xp-icons.js [--check]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ICONS = path.join(__dirname);
const xpPath = path.join(ROOT, 'scripts', 'xp-icons.js');

const old = fs.readFileSync(xpPath, 'utf8');
const oldIds = [...old.matchAll(/GLYPHS\['([^']+)'\]/g)].map(m => m[1]);

const genSrc = fs.readFileSync(path.join(ICONS, 'generated-glyphs.js'), 'utf8');
const genIds = [...genSrc.matchAll(/GLYPHS\['([^']+)'\]/g)].map(m => m[1]);
const handSrc = fs.readFileSync(path.join(ICONS, 'hand-drawn.js'), 'utf8');
const handIds = [...handSrc.matchAll(/GLYPHS\['([^']+)'\]/g)].map(m => m[1]);

const newIds = new Set([...genIds, ...handIds]);
const missing = oldIds.filter(id => !newIds.has(id));
const extra = [...newIds].filter(id => !oldIds.includes(id));

if (process.argv.includes('--check')) {
  console.log('old:', oldIds.length, 'gen:', genIds.length, 'hand:', handIds.length);
  console.log('missing in new:', missing.length ? missing.join(', ') : '(none)');
  console.log('extra in new  :', extra.length ? extra.join(', ') : '(none)');
  process.exit(0);
}

if (missing.length) {
  console.error('ABORT — 以下旧图标在新集中缺失，请先补齐：\n  ' + missing.join('\n  '));
  process.exit(1);
}

const head = old.slice(0, old.indexOf('const GLYPHS = {};') + 'const GLYPHS = {};'.length);
const tail = old.slice(old.lastIndexOf('module.exports'));

const banner = (t) => `\n/* ============================================================\n * ${t}\n * ============================================================ */\n`;

const merged = head
  + banner('① 自动管线图标（pixelarticons 解码 → 连通域上色，tools/icons/colorize.js emit 生成，勿手改）')
  + '\n' + genSrc.trim() + '\n'
  + banner('② 手绘图标（自动管线质量差或源缺失，tools/icons/hand-drawn.js 维护）')
  + '\n' + handSrc.trim() + '\n'
  + '\n' + tail;

// 语法自检：require 一次并校验全部 16×16
const tmp = path.join(ICONS, '.tmp-merged.js');
fs.writeFileSync(tmp, merged);
const mod = require(tmp);
const count = Object.keys(mod.GLYPHS).length;
for (const [id, art] of Object.entries(mod.GLYPHS)) {
  const rows = art.trim().split('\n');
  if (rows.length !== 16 || rows.some(r => r.length !== 16)) {
    throw new Error(`${id} 尺寸错误 ${rows.length}×${rows[0] ? rows[0].length : 0}`);
  }
  for (const row of rows) for (const ch of row) {
    if (ch !== '.' && !mod.PALETTE[ch]) throw new Error(`${id} 未知色键 "${ch}"`);
  }
}
fs.unlinkSync(tmp);

fs.writeFileSync(xpPath, merged);
console.log(`xp-icons.js rewritten: ${count} glyphs (gen ${genIds.length} + hand ${handIds.length}), syntax+grid check OK`);
