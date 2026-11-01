// 生成 tools/icons/preview.html：全部图标的可视化预览页（自包含，双击即开）
// 用法：node tools/icons/build-preview-html.js
const fs = require('fs');
const path = require('path');
const { pixelSymbol, pixelGlyph, GLYPHS, PALETTE } = require('../../scripts/xp-icons.js');

const ids = Object.keys(GLYPHS).sort();

// 分组：按前缀约定归类展示
const GROUPS = [
  { title: '内容 / 页面图标', test: (id) => /^icon-(clipboard|post|tag|palette|chart|compass|search|pencil|clock|image|lock|calendar|copy|warn|critical|fallback|pin|book|bulb)$/.test(id) },
  { title: '导航（nav-*）', test: (id) => id.startsWith('nav-') },
  { title: '托盘 / 开始菜单（tray-*）', test: (id) => id.startsWith('tray-') },
  { title: '播放器 / 媒体（icon-media-*）', test: (id) => id.startsWith('icon-media-') },
  { title: '社交（icon-social-*）', test: (id) => id.startsWith('icon-social-') },
  { title: '点赞 / 待办', test: (id) => /^icon-(like|todo)-/.test(id) },
  { title: '小游戏 / 小工具卡片', test: (id) => /^icon-(brick|snake|puzzle|calc|notepad|gamepad|wrench|game-guide|art-guide|tech-guide|menu|close)$/.test(id) },
];
const grouped = new Set(GROUPS.flatMap(g => ids.filter(g.test)));
const rest = ids.filter(id => !grouped.has(id));
if (rest.length) {
  const restSet = new Set(rest);
  GROUPS.push({ title: '其它', test: (id) => restSet.has(id) });
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// 每个 cell：id 文本 + 16/32/64px 三档渲染；rect 串放 data 属性，点按钮才复制（不放 title，否则悬停弹出一大坨）
function cell(id) {
  const sym = pixelSymbol(id, GLYPHS[id]);
  const rects = pixelGlyph(id, GLYPHS[id]);
  return `<div class="cell" data-id="${id}" data-rects="${esc(rects)}">
  <div class="art">
    <span class="s16"><svg width="16" height="16"><use href="#${id}"/></svg></span>
    <span class="s32"><svg width="32" height="32"><use href="#${id}"/></svg></span>
    <span class="s64"><svg width="64" height="64"><use href="#${id}"/></svg></span>
  </div>
  <div class="meta"><code>${id}</code><button class="copy-rects" type="button" title="复制 SVG rect 串">SVG</button></div>
</div>`;
}

const sections = GROUPS.map((g, gi) => {
  const list = ids.filter(g.test);
  if (!list.length) return '';
  return `<h2>${g.title} <small>${list.length}</small></h2>
<div class="grid" data-group="${gi}">${list.map(cell).join('\n')}</div>`;
}).join('\n');

const symbols = ids.map(id => pixelSymbol(id, GLYPHS[id])).join('\n');

// 色板条
const swatches = Object.entries(PALETTE).map(([k, v]) =>
  `<span class="sw" title="色键 ${k} = ${v}"><i style="background:${v}"></i>${k}</span>`).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>xp-icons 预览 — ${ids.length} glyphs</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font: 13px/1.5 "Segoe UI", system-ui, sans-serif;
         background: #f4f4f4; color: #222; }
  @media (prefers-color-scheme: dark) {
    body { background: #1c1c1c; color: #ddd; }
    .cell { background: #2a2a2a !important; border-color: #444 !important; }
    code { color: #9cd !important; }
  }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .sub { opacity: .7; margin-bottom: 16px; }
  .pal { margin: 12px 0 20px; display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { display: inline-flex; align-items: center; gap: 4px; font: 11px monospace;
        background: rgba(128,128,128,.12); padding: 2px 6px; border-radius: 3px; }
  .sw i { width: 12px; height: 12px; display: inline-block; outline: 1px solid rgba(0,0,0,.2); }
  h2 { margin: 28px 0 10px; font-size: 15px; border-bottom: 1px solid rgba(128,128,128,.3); padding-bottom: 4px; }
  h2 small { opacity: .55; font-weight: normal; margin-left: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 10px; }
  .cell { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 12px 8px 8px;
          text-align: center; transition: transform .08s; }
  .cell:hover { transform: translateY(-2px); box-shadow: 0 3px 10px rgba(0,0,0,.15); }
  .art { display: flex; align-items: flex-end; justify-content: center; gap: 10px; min-height: 68px; }
  .s16 svg, .s32 svg, .s64 svg { image-rendering: pixelated; display: block; }
  .meta { margin-top: 8px; position: relative; }
  code { font: 10px/1.3 Consolas, monospace; color: #05a; word-break: break-all; display: block; padding-right: 30px; }
  .copy-rects { position: absolute; right: 0; bottom: 0; font: 9px Consolas, monospace; padding: 1px 5px;
                border: 1px solid #bbb; border-radius: 3px; background: rgba(128,128,128,.08);
                color: inherit; cursor: pointer; opacity: 0; transition: opacity .12s; }
  .cell:hover .copy-rects { opacity: .85; }
  .copy-rects:hover { opacity: 1 !important; border-color: #05a; color: #05a; }
  svg { shape-rendering: crispEdges; }
  .toolbar { position: sticky; top: 0; background: inherit; padding: 8px 0; z-index: 9; }
  input { padding: 6px 10px; font-size: 13px; width: 240px; border: 1px solid #999; border-radius: 4px; }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
${symbols}
</svg>

<h1>xp-icons 预览</h1>
<div class="sub">${ids.length} 个图标 · 16×16 点阵 · 自动浮雕 · 生成于 ${new Date().toLocaleString('zh-CN')}（改图标后重跑 node tools/icons/build-preview-html.js）</div>
<div class="pal">${swatches}</div>
<div class="toolbar"><input id="q" placeholder="过滤 id（如 social、todo）…" autofocus></div>

${sections}

<script>
document.getElementById('q').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.cell').forEach(c => {
    c.style.display = c.dataset.id.includes(q) ? '' : 'none';
  });
  document.querySelectorAll('h2').forEach(h => {
    const grid = h.nextElementSibling;
    const any = [...grid.children].some(c => c.style.display !== 'none');
    h.style.display = any ? '' : 'none';
    grid.style.display = any ? '' : 'none';
  });
});
// 点击任意格：复制该图标的 <use> 标签；点 SVG 按钮：复制 rect 串
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-rects');
  if (btn) {
    const cell = btn.closest('.cell');
    const rects = cell.dataset.rects;
    const wrapped = '<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges">' + rects + '</svg>';
    navigator.clipboard.writeText(wrapped).then(() => flash(btn, '✓ 已复制'));
    e.stopPropagation();
    return;
  }
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const tag = '<use href="#' + cell.dataset.id + '"/>';
  navigator.clipboard.writeText(tag).then(() => {
    flash(cell.querySelector('code'), '已复制 ' + tag);
  });
});
function flash(el, text) {
  if (!el) return;
  const old = el.textContent;
  el.textContent = text;
  setTimeout(() => { el.textContent = old; }, 900);
}
</script>
</body>
</html>`;

const out = path.join(__dirname, 'preview.html');
fs.writeFileSync(out, html);
console.log(`written ${out} — ${ids.length} icons`);
