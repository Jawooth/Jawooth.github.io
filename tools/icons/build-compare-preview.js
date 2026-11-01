// 对照预览页生成器：当前像素图标 vs IconPark 多色版
// 用法：node tools/icons/build-compare-preview.js
// 输出：tools/icons/compare-preview.html
// 特性：
//  1. 每行 = 站内 id，左列当前像素 16/32px，右列 IconPark 原色 24/32px
//  2. 每行标注：站点用途说明（来自 park-map）+ 实际使用背景色块（窗口标题/页脚/卡片…）
//  3. 顶部按站点分组（沿用 build-preview-html 的 GROUPS 语义）
//  4. IconPark 以内联 <svg> 渲染（viewBox 0 0 48 48，原色填充）
const fs = require('fs');
const path = require('path');
const { GLYPHS, pixelSymbol, PALETTE } = require('../../scripts/xp-icons.js');
const park = require('@iconify-json/icon-park/icons.json');
const MAP = require('./park-map.js');
const { recolor, TINT } = require('./park-recolor.js');
const { PARK_GLYPHS } = require('./park-glyphs.js');

const USE_RECOLOR = process.argv.includes('--recolor');

// 使用场景 → 背景色（取自站内 XP 风格实际底色）
const CONTEXTS = {
  titlebar: { label: '窗口标题栏', bg: 'linear-gradient(180deg,#3a6ea5,#2c567f)', fg: '#fff' },   // XP 蓝标题
  taskbar:  { label: '任务栏', bg: 'linear-gradient(180deg,#245edb,#1941a5)', fg: '#fff' },       // XP 任务栏蓝
  page:     { label: '页面正文（米白）', bg: '#f7f3ea', fg: '#333' },                              // 站内米纸底
  card:     { label: '卡片（白）', bg: '#ffffff', fg: '#333' },                                    // games/tools 卡片
  footer:   { label: '页脚（深灰蓝）', bg: '#2b3a4a', fg: '#dfe6ee' },                             // 页脚底色
  toolbar:  { label: '播放器/工具条（浅灰）', bg: '#e8ecf2', fg: '#333' },                         // 播放器条
};

// 每个图标的使用背景（主场景）
function contextOf(id) {
  if (id.startsWith('tray-')) return 'taskbar';
  if (id.startsWith('nav-')) return 'titlebar';
  if (id.startsWith('icon-social-')) return 'footer';
  if (/^icon-(media|like|todo)-/.test(id)) return 'toolbar';
  if (/^icon-(brick|snake|puzzle|calc|notepad|gamepad|wrench|game-guide|art-guide|tech-guide|book|bulb|palette)/.test(id)) return 'card';
  return 'page';
}

const GROUPS = [
  { title: '内容 / 页面图标', test: (id) => /^icon-(clipboard|post|tag|palette|chart|compass|search|pencil|clock|image|lock|calendar|copy|warn|critical|fallback|pin|book|bulb|notepad)$/.test(id) },
  { title: '导航', test: (id) => id.startsWith('nav-') },
  { title: '托盘 / 开始菜单', test: (id) => id.startsWith('tray-') },
  { title: '播放器 / 媒体', test: (id) => id.startsWith('icon-media-') },
  { title: '社交', test: (id) => id.startsWith('icon-social-') },
  { title: '点赞 / 待办', test: (id) => /^icon-(like|todo)-/.test(id) },
  { title: '小游戏 / 小工具卡片', test: (id) => /^icon-(brick|snake|puzzle|calc|gamepad|wrench|game-guide|art-guide|tech-guide|menu|close)$/.test(id) },
];

const all = Object.keys(GLYPHS);
const grouped = new Set();
const sections = [];
for (const g of GROUPS) {
  const ids = all.filter((id) => g.test(id));
  ids.forEach((id) => grouped.add(id));
  if (ids.length) sections.push({ title: g.title, ids });
}
const rest = all.filter((id) => !grouped.has(id));
if (rest.length) sections.push({ title: '其它', ids: rest });

function parkSvg(name, size, siteId) {
  const ic = park.icons[name];
  if (!ic) return `<span style="color:#c00">MISSING ${name}</span>`;
  let body = ic.body;
  if (USE_RECOLOR && siteId && TINT[siteId]) {
    body = recolor(body, TINT[siteId][0], TINT[siteId][1]);
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// 站内像素 symbol（取 build-preview-html 同款 sprite）+ IconPark 像素化 symbol + 无浮雕版（fk-/pkf- 前缀）
const symbols = all.map((id) => pixelSymbol(id, GLYPHS[id])).join('\n')
  + '\n' + all.map((id) => flatSymbol('fk-' + id, GLYPHS[id])).join('\n')
  + '\n' + Object.keys(PARK_GLYPHS).map((id) => pixelSymbol('pk-' + id, PARK_GLYPHS[id])).join('\n')
  + '\n' + Object.keys(PARK_GLYPHS).map((id) => flatSymbol('pkf-' + id, PARK_GLYPHS[id])).join('\n');

// 社交/播放器：不走像素化，直接平滑矢量（用户决定这两组保留 IconPark 平滑线条）
const SMOOTH = (id) => /^(icon-social-|icon-media-)/.test(id);
// 用户要求：社交/播放器去除填充颜色，只留线条 → 全部 path/rect/circle 强制 fill=none（保留描边）
// 注意：无 fill 属性的元素默认黑填充（如 github），必须显式加 fill="none"
function stripFill(body) {
  return body.replace(/<(path|rect|circle|ellipse|polygon)\b([^>]*?)(\/?)>/g, (m, tag, attrs, self) => {
    const stripped = attrs.replace(/\sfill="[^"]*"/g, '');
    return `<${tag}${stripped} fill="none"${self ? ' />' : '>'}`;
  });
}

// 平滑组 SVG：去填充 + 统一蓝线条（深浅底均可辨）
function parkSmoothSvg(name, size) {
  const ic = park.icons[name];
  if (!ic) return `<span style="color:#c00">MISSING ${name}</span>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">${stripFill(ic.body).replace(/stroke="#000"/g, 'stroke="#4a86e8"')}</svg>`;
}

// 无浮雕（flat）rect 输出：与 pixelSymbol 相同网格但跳过 bevelGrid 浮雕
function flatRects(art) {
  const g = art.split('\n').filter((l) => l.length === 16).slice(0, 16)
    .map((line) => [...line].map((ch) => (ch === '.' || ch === ' ' ? null : (PALETTE[ch] || null))));  const out = [];
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
function flatSymbol(id, art) {
  return `<symbol id="${id}" viewBox="0 0 16 16"><g shape-rendering="crispEdges">${flatRects(art)}</g></symbol>`;
}

function parkPixelSvg(id, size) {
  if (SMOOTH(id)) return `<small style="color:#999">平滑→</small>`;
  if (!PARK_GLYPHS[id]) return '<small>—</small>';
  return `<svg width="${size}" height="${size}"><use href="#pk-${id}"/></svg>`;
}

function row(id) {
  const [parkName, why] = MAP[id] || ['—', '（未映射）'];
  const ctxKey = contextOf(id);
  const ctx = CONTEXTS[ctxKey];
  const approx = String(why).includes('近似') || /\（.*无.*\）/.test(String(why));
  return `<tr class="row" data-id="${id}">
  <td class="idcell"><code>${id}</code><small>${why || ''}${approx ? ' <b class="approx">近似</b>' : ''}</small></td>
  <td class="cell cur" style="background:${ctx.bg}">
    <span class="on-bg" title="${ctx.label}">
      <svg width="16" height="16"><use href="#${id}"/></svg>
      <svg width="32" height="32"><use href="#${id}"/></svg>
    </span>
    <small>${ctx.label}</small>
  </td>
  <td class="cell park" style="background:${ctx.bg}">
    <span class="on-bg" title="${ctx.label}">
      ${parkSvg(parkName, 24, id)}
      ${parkSvg(parkName, 32, id)}
    </span>
    <small>${ctx.label}</small>
  </td>
  <td class="cell parkpx ${SMOOTH(id) ? 'smooth' : ''}" style="background:${ctx.bg}">
    <span class="on-bg" title="${ctx.label}">
      ${SMOOTH(id) ? parkSmoothSvg(parkName, 16) + parkSmoothSvg(parkName, 32) : parkPixelSvg(id, 16) + parkPixelSvg(id, 32)}
    </span>
    <small>${ctx.label}</small>
  </td>
  <td class="cell flat" style="background:${ctx.bg}">
    <span class="on-bg" title="${ctx.label}">
      ${SMOOTH(id) ? '<small style="color:#999">平滑组</small>' : `<svg width="16" height="16"><use href="#${PARK_GLYPHS[id] ? 'pkf-' : 'fk-'}${id}"/></svg>
      <svg width="32" height="32"><use href="#${PARK_GLYPHS[id] ? 'pkf-' : 'fk-'}${id}"/></svg>`}
    </span>
    <small>无浮雕</small>
  </td>
  <td class="cell plain">${parkSvg(parkName, 40, id)}<small>原始</small></td>
</tr>`;
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>对照预览：像素 vs IconPark 多色</title>
<style>
  :root { color-scheme: light; }
  body { font: 14px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; margin: 0; background: #f0ebe1; color: #222; }
  header { position: sticky; top: 0; z-index: 10; background: #fffdf8ee; backdrop-filter: blur(4px);
           padding: 12px 20px; border-bottom: 1px solid #d8cfc0; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  header p { margin: 0; color: #666; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th { position: sticky; top: 61px; background: #efe7d8; padding: 6px 10px; text-align: left;
       font-size: 12px; border-bottom: 2px solid #d8cfc0; z-index: 5; }
  td { padding: 8px 10px; border-bottom: 1px solid #e5ddcf; vertical-align: middle; }
  tr.section td { background: #e3d9c6; font-weight: 600; font-size: 13px; padding: 6px 10px; }
  .idcell code { font: 12px Consolas, monospace; color: #05a; display: block; }
  .idcell small { color: #777; font-size: 11px; }
  .approx { color: #b60; font-weight: 600; font-size: 10px; border: 1px solid #b60; border-radius: 3px; padding: 0 3px; }
  .cell { text-align: center; min-width: 130px; }
  .cell small { display: block; margin-top: 4px; color: rgba(0,0,0,.45); font-size: 10px; }
  .on-bg { display: inline-flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 4px; }
  .cell.park svg { filter: drop-shadow(0 0 1px rgba(255,255,255,.6)); }
  .cell.cur svg, .cell.parkpx:not(.smooth) svg, .cell.flat svg { image-rendering: pixelated; }
  .cell.parkpx.smooth svg { filter: drop-shadow(0 0 1px rgba(255,255,255,.6)); }
  .cell.plain { background: repeating-conic-gradient(#f2f2f2 0 25%, #fff 0 50%) 0 0/16px 16px; text-align: center; }
  .cell.plain small { color: #999; }
  #filter { margin-left: 16px; padding: 4px 8px; border: 1px solid #c8bfae; border-radius: 4px; width: 200px; font: 12px sans-serif; }
  tr.hide { display: none; }
</style>
</head>
<body>
<header>
  <h1>对照预览：当前像素图标 vs IconPark 多色（Apache 2.0）
    <input id="filter" type="text" placeholder="过滤 id / 用途…">
  </h1>
  <p>左=现行 16×16 像素浮雕 · 左二=IconPark 重着色后像素化 16×16（落库候选；社交/播放器组保持平滑矢量不入像素化） · 中=IconPark 置于该图标真实使用背景 · 右=IconPark 原始（棋盘底）。
     带「近似」标的是 IconPark 无精确语义、暂用替代形。颜色不满意可改 park-map.js 换名。</p>
</header>
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>
<table>
<thead><tr><th>图标 / 用途</th><th>当前（像素）</th><th>IconPark 像素化（16×16）</th><th>IconPark（在使用背景上）</th><th>IconPark 无浮雕（16×16）</th><th>IconPark（原始）</th></tr></thead>
<tbody>
${sections.map((s) => `  <tr class="section"><td colspan="6">${s.title}</td></tr>\n` + s.ids.map(row).join('\n')).join('\n')}
</tbody>
</table>
<script>
document.getElementById('filter').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('tr.row').forEach((tr) => {
    tr.classList.toggle('hide', q && !tr.dataset.id.includes(q) && !tr.textContent.toLowerCase().includes(q));
  });
  document.querySelectorAll('tr.section').forEach((s) => {
    let any = false, n = s.nextElementSibling;
    while (n && !n.classList.contains('section')) { if (!n.classList.contains('hide')) any = true; n = n.nextElementSibling; }
    s.classList.toggle('hide', q && !any);
  });
});
</script>
</body>
</html>`;

const out = path.join(__dirname, USE_RECOLOR ? 'compare-preview-recolor.html' : 'compare-preview.html');
fs.writeFileSync(out, html);
console.log('written ' + out + ' — ' + all.length + ' icons, mapped ' + Object.keys(MAP).length + (USE_RECOLOR ? ' [18色重着色]' : ' [原始蓝]'));
