/* 探针自检：确认 _contrast-probe.js 真的跑起来了（不是抛异常被吞掉），
 * 并把几个「已知对照点」的实测比值打出来人工核对。
 * 用法：node tools/check/probe-contrast-sanity.js http://127.0.0.1:4010
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const profile = path.join(os.tmpdir(), 'dsh-contrast-sanity');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

/* 对照点：选择器 → 期望落在哪个区间 */
const SPOTS = [
  ['.xp-window-title-text', '标题栏白字（渐变蓝底，应 PASS）'],
  ['.xp-start-text', '开始按钮白字（绿渐变底，应 PASS）'],
  ['.xp-taskbar-title', '任务栏标题（应 PASS）'],
  ['.bubble-from', '便利贴出处（黄纸底）'],
  ['.mp4-marquee-copy', '播放器歌名/歌手（近黑屏底，应 PASS）'],
  ['.article-meta', '文章日期（窗口面底）'],
  ['.xp-badge', '「开发中」徽标'],
  ['.thanks-license', '致谢授权条'],
  ['.filter-pill', '作品页筛选药丸']
];

const PROBE = fs.readFileSync(path.join(__dirname, '_contrast-probe.js'), 'utf8');

/* 把探针包一层：顺便返回「检查了多少个元素」，证明它真的在跑 */
const WRAP = `(() => {
  const __t = ${JSON.stringify(SPOTS)};
  /* 探针本身是 IIFE，直接求值拿到数组。
   * 注意不能写成 `return ${PROBE}` —— 探针文件以注释开头，ASI 会把 return 提前结束。 */
  const __res = ${PROBE};
  const srgb = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const lum = ([r,g,b]) => 0.2126*srgb(r) + 0.7152*srgb(g) + 0.0722*srgb(b);
  const ratio = (a,b) => { const l1=lum([a.r,a.g,a.b]), l2=lum([b.r,b.g,b.b]);
    const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };
  const parse = s => { const m = s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null;
    const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const spots = __t.map(([sel, label]) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, label, found: false };
    const st = getComputedStyle(el);
    const fg = parse(st.color);
    const rect = el.getBoundingClientRect();
    /* 直接量「前景 vs 元素自己的 backgroundColor」，用来人工核对探针结论 */
    const own = parse(st.backgroundColor);
    return { sel, label, found: true, color: st.color, bg: st.backgroundColor,
      bgImage: st.backgroundImage.slice(0, 60), px: Math.round(parseFloat(st.fontSize)),
      ownRatio: (fg && own && own.a > 0) ? +ratio(fg, own).toFixed(2) : null };
  });
  let textNodes = 0;
  document.querySelectorAll('body *').forEach(el => {
    if (['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','RECT','G','USE','DEFS','SYMBOL','BR','IMG'].includes(el.tagName)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const txt = [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('').trim();
    if (!txt) return;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.opacity === '0') return;
    textNodes++;
  });
  return { checkedElements: textNodes, failures: __res.length, spots };
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

  for (const mode of ['light', 'dark']) {
    await send('Page.navigate', { url: base + '/' });
    await sleep(2600);
    await send('Runtime.evaluate', { expression: mode === 'dark' ? "document.documentElement.classList.add('dark')" : "document.documentElement.classList.remove('dark')" });
    await sleep(300);
    const r = await send('Runtime.evaluate', { returnByValue: true, expression: WRAP });
    const v = r.result && r.result.result ? r.result.result.value : null;
    console.log('\n===== ' + mode.toUpperCase() + ' =====');
    if (!v) { console.log('探针没返回结果：', JSON.stringify(r).slice(0, 400)); continue; }
    console.log('检查元素数：' + v.checkedElements + '，探针报出的不达标数：' + v.failures);
    v.spots.forEach(s => {
      if (!s.found) { console.log('  [缺失] ' + s.sel + '  ' + s.label); return; }
      console.log('  ' + s.sel.padEnd(22) + ' 自身底色比值 ' + String(s.ownRatio).padEnd(6) +
        ' fg ' + s.color.padEnd(20) + ' bg ' + s.bg.padEnd(22) + ' bgImage=' + (s.bgImage || 'none'));
    });
  }
  ws.close(); proc.kill(); process.exit(0);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
