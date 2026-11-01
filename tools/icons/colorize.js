// 多色化生成器：pixelarticons 24×24 → 12×12 → 连通域标号 → 16×16 GLYPHS ASCII
// 标号规则：'#' 系描边连通域 = A,B,C…（按面积降序）；'o' 内部洞连通域 = a,b,c…
// 两个模式：
//   node colorize.js preview  → 生成 review2.txt（带连通域标号，供人工配色审查）
//   node colorize.js emit     → 生成 generated-glyphs.js（按 COLORS 表上色的 GLYPHS 片段）
const { decodeIcon, SVG_DIR } = require('./decode-pixelarticons');
const { MAP } = require('./review-decode');
const fs = require('fs');
const path = require('path');

/* 质量差 / 源缺失 → 手绘，不走自动管线（在 hand-drawn.js 里画） */
const HAND_DRAWN = new Set([
  'icon-pencil', 'icon-wrench', 'icon-palette', 'icon-social-x', 'icon-todo-done',
  'icon-brick', 'icon-snake', 'icon-social-facebook', 'icon-gamepad', 'icon-media-dice',
  'icon-social-rss', 'icon-puzzle', 'icon-book', 'icon-social-weibo', 'icon-social-zhihu',
  'icon-todo-pending',
  // 2026-10-31 视觉审查追加：calc 自动版像记事本（无屏幕边框层次）
  'icon-calc',
  // icon-user：站标本尊 48×48 像素兔真身在 xp-enhance.js:259，绝不进 GLYPHS
  // （否则 xp-enhance.js 的 sprite 全量登记会覆盖它）。
  'icon-user',
]);

/* ── 连通域标号 ───────────────────────────────────────────
   输入 12×12 布尔栅格；输出同行字符串：描边域 A/B/C、内部域 a/b/c、外部 '.' */
function labelRegions(g) {
  const N = 12;
  const lab = Array.from({ length: N }, () => new Array(N).fill('.'));
  let strokeN = 0, holeN = 0;
  const sizes = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (lab[y][x] !== '.') continue; // 已标
    const isStroke = g[y][x];
    // 透明区先探是否贴边（外部）：贴边整片保持透明，不占编号
    if (!isStroke) {
      const st = [[x, y]]; const seen = new Set([x + ',' + y]);
      let touchesEdge = false;
      while (st.length && !touchesEdge) {
        const [cx, cy] = st.pop();
        if (cx === 0 || cy === 0 || cx === N - 1 || cy === N - 1) { touchesEdge = true; break; }
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < N && ny >= 0 && ny < N && !g[ny][nx] && !seen.has(nx + ',' + ny)) {
            seen.add(nx + ',' + ny); st.push([nx, ny]);
          }
        }
      }
      if (touchesEdge) {
        const q = [[x, y]]; lab[y][x] = 'X';
        while (q.length) {
          const [cx, cy] = q.pop();
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < N && ny >= 0 && ny < N && !g[ny][nx] && lab[ny][nx] === '.') {
              lab[ny][nx] = 'X'; q.push([nx, ny]);
            }
          }
        }
        continue;
      }
    }
    const letter = isStroke
      ? String.fromCharCode(65 + strokeN++)   // A…
      : String.fromCharCode(97 + holeN++);    // a…
    // BFS
    const q = [[x, y]]; lab[y][x] = letter; let area = 0;
    while (q.length) {
      const [cx, cy] = q.pop(); area++;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < N && ny >= 0 && ny < N && lab[ny][nx] === '.' && g[ny][nx] === isStroke) {
          lab[ny][nx] = letter; q.push([nx, ny]);
        }
      }
    }
    sizes.push({ letter, area, isStroke });
  }
  // 按面积重排序号：描边域和内部域各自独立编号
  const strokes = sizes.filter(s => s.isStroke).sort((a, b) => b.area - a.area);
  const holes = sizes.filter(s => !s.isStroke).sort((a, b) => b.area - a.area);
  const remap = {};
  strokes.forEach((s, i) => { remap[s.letter] = String.fromCharCode(65 + i); });
  holes.forEach((s, i) => { remap[s.letter] = String.fromCharCode(97 + i); });
  return lab.map(row => row.map(c => (c === 'X' ? '.' : remap[c] || '.')).join(''));
}

/* 12×12 → 16×16：光学盒居中（offset 2,2），与站内约定一致 */
function to16(lab12) {
  const rows = [];
  const pad = '..'.repeat(1);
  const blank = '.'.repeat(16);
  rows.push(blank, blank);
  for (const r of lab12) rows.push(pad + r + pad);
  rows.push(blank, blank);
  return rows.join('\n');
}

function buildAll() {
  const out = {};
  for (const [id, src] of Object.entries(MAP)) {
    if (HAND_DRAWN.has(id)) continue;
    const g = decodeIcon(src);
    if (!g) { console.error('MISSING source:', id, '←', src); continue; }
    out[id] = { src, grid: to16(labelRegions(g)) };
  }
  return out;
}

/* ── preview 模式 ── */
function preview(all) {
  const lines = [];
  for (const [id, { src, grid }] of Object.entries(all)) {
    lines.push(`=== ${id}  (${src}) ===`, grid, '');
  }
  fs.writeFileSync(path.join(__dirname, 'review2.txt'), lines.join('\n'));
  console.log('review2.txt written,', Object.keys(all).length, 'icons');
}

/* ── emit 模式 ── */
function emit(all) {
  const COLORS = require('./colors');
  const lines = ['// 自动生成：tools/icons/colorize.js emit — 不要手改，改配色去 tools/icons/colors.js'];
  let warn = 0;
  for (const [id, { grid }] of Object.entries(all)) {
    const spec = COLORS[id];
    if (!spec) { console.error('NO COLORS for', id); warn++; continue; }
    const painted = grid.split('\n').map(row => row.split('').map(ch => {
      if (ch === '.') return '.';
      const key = spec[ch] !== undefined ? spec[ch] : spec['*'];
      if (!key) { console.error(`NO COLOR: ${id} region "${ch}"`); warn++; return '.'; }
      return key;
    }).join('')).join('\n');
    lines.push('', `GLYPHS['${id}'] = \``, painted, '`;');
  }
  fs.writeFileSync(path.join(__dirname, 'generated-glyphs.js'), lines.join('\n') + '\n');
  console.log('generated-glyphs.js written,', Object.keys(all).length, 'icons,', warn, 'warnings');
}

const all = buildAll();
if (process.argv[2] === 'emit') emit(all);
else preview(all);
