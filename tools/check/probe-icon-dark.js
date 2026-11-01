/* 深色模式下的图标可见性实测。
 *
 * 图标是 data-URI SVG 背景图，颜色**写死在 SVG 里**（tools/icons/smooth-glyphs.js），
 * CSS 的 color / currentColor 改不动它。所以「深色下图标看不见」这种结论
 * 不能靠看代码猜，得把 SVG 里的实际颜色抠出来，跟深色底色算对比度。
 *
 * 用法：node tools/check/probe-icon-dark.js http://127.0.0.1:4010
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const profile = path.join(os.tmpdir(), 'dsh-icon-dark');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

/* 浏览器端：把所有 .icon 元素的 background-image 解出 SVG，抓里面的颜色，
 * 再跟该元素所在位置的背景色算对比度。 */
const PROBE = `(() => {
  const srgb = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const lum = ([r,g,b]) => 0.2126*srgb(r) + 0.7152*srgb(g) + 0.0722*srgb(b);
  const ratio = (a,b) => { const l1=lum([a.r,a.g,a.b]), l2=lum([b.r,b.g,b.b]);
    const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };
  const parseColor = s => { if(!s) return null;
    const m = s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null;
    const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number);
    if(p.length<3||p.some(isNaN)) return null;
    return { r:p[0], g:p[1], b:p[2], a:p.length>3?p[3]:1 }; };
  const over = (fg,bg) => ({ r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a),
    b: fg.b*fg.a + bg.b*(1-fg.a), a: 1 });

  const out = [];
  const dbg = [];
  try {
  document.querySelectorAll('.icon, [class*="icon-"]').forEach(el => {
    const st = getComputedStyle(el);
    const bi = st.backgroundImage;
    if (!bi || bi === 'none' || bi.indexOf('svg') < 0) return;
    /* 注意：data-URI 里的 SVG 含字面量 '(' ')'（如 transform="scale(0.33)"），
     * 不能用 [^"')]+ 截，会在第一个 ')' 处断掉。改成从第一个逗号截到末尾的 '")'。 */
    const start = bi.indexOf(',');
    const end = bi.lastIndexOf('")');
    if (start < 0 || end <= start) return;
    let svg = '';
    try { svg = decodeURIComponent(bi.slice(start + 1, end)); } catch (e) { return; }
    const colors = [];
    const re = /(fill|stroke)="([^"]+)"/g; let mm;
    while ((mm = re.exec(svg))) {
      const c = parseColor(mm[2].startsWith('#') ? hexToRgb(mm[2]) : mm[2]);
      if (c) colors.push({ role: mm[1], c: mm[2] });
    }
    if (!colors.length) return;

    /* 该元素自身背景（没有就往上找第一个不透明的） */
    const r = el.getBoundingClientRect();
    let bg = null, e = el;
    while (e && !bg) {
      const s2 = getComputedStyle(e);
      const c = parseColor(s2.backgroundColor);
      if (c && c.a > 0.99) bg = c;
      e = e.parentElement;
    }
    if (!bg) bg = { r: 255, g: 255, b: 255, a: 1 };

    /* 每个 SVG 颜色跟底色算一次，取最差 */
    const rows = colors.map(x => {
      const c = parseColor(x.c.startsWith('#') ? hexToRgb(x.c) : x.c);
      if (!c) return null;
      return { role: x.role, hex: x.c, ratio: +ratio(c, bg).toFixed(2) };
    }).filter(Boolean);
    if (!rows.length) return;
    rows.sort((a, b) => a.ratio - b.ratio);
    out.push({
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50),
      tag: el.tagName.toLowerCase(),
      w: Math.round(r.width), h: Math.round(r.height),
      bg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')',
      worst: rows[0], colors: rows.map(x => x.role + ':' + x.hex + '=' + x.ratio).join(' ')
    });
  });
  function hexToRgb(h) { h = h.replace('#','');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return 'rgb(' + parseInt(h.slice(0,2),16) + ',' + parseInt(h.slice(2,4),16) + ',' + parseInt(h.slice(4,6),16) + ')'; }
  } catch (e) { dbg.push('ERR: ' + e.message); }
  return { out, dbg };
})()`;

async function main() {
  const port = await findFreePort();
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-crash-reporter',
    '--disable-breakpad', '--disable-features=RendererCodeIntegrity', `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60; i++) {
    await sleep(400);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch (_) {}
  }
  if (!target) { proc.kill(); throw new Error('CDP 没连上'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });

  for (const [mode, url] of [['light', base + '/'], ['dark', base + '/hello-world/']]) {
    await send('Page.navigate', { url });
    await sleep(2600);
    await send('Runtime.evaluate', { expression: mode === 'dark' ? "document.documentElement.classList.add('dark')" : "document.documentElement.classList.remove('dark')" });
    await sleep(300);
    const r = await send('Runtime.evaluate', { returnByValue: true, expression: PROBE });
    const raw = r.result && r.result.result ? r.result.result.value : null;
    console.log('\n===== ' + mode.toUpperCase() + ' (' + url + ') =====');
    const list = Array.isArray(raw) ? { out: raw, dbg: [] } : raw;
    if (!list || !list.out) { console.log('探针异常:', JSON.stringify(raw).slice(0,400)); continue; }
    if (list.dbg && list.dbg.length) console.log('dbg:', list.dbg.join(' | '));
    const arr = list.out.filter(v => v.w > 0 && v.h > 0);
    if (!arr.length) { console.log('（这页没有可见的 .icon 背景图元素）'); continue; }
    arr.forEach(v => {
      const flag = v.worst.ratio < 3 ? '  ❌ 几乎看不见' : v.worst.ratio < 4.5 ? '  ⚠ 偏低' : '  ✅';
      console.log(flag + '  ' + v.cls.padEnd(40) + ' ' + v.worst.hex.padEnd(8) + v.worst.ratio + ':1  底 ' + v.bg.padEnd(20) + v.colors);
    });
  }
  ws.close(); proc.kill(); process.exit(0);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
