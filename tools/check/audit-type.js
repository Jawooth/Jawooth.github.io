/* 桌面端排版探针：正文每行字数、标题层级、任务栏遮挡、悬浮播放器遮挡、
 * 窗口标题栏真实背景（渐变取样）。
 * 用法：node tools/check/audit-type.js <base> <width> <height> <pages>
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const width = parseInt(process.argv[3] || '1440', 10);
const height = parseInt(process.argv[4] || '900', 10);
const pages = (process.argv[5] || '/,/hello-world/,/blog/,/works/').split(',');
const profile = path.join(os.tmpdir(), 'dsh-type-edge');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

const PROBE = `(() => {
  const out = {};

  // 1) 正文每行字数（中文按 16px 字宽估算）：取实际排版宽度
  out.measure = [];
  document.querySelectorAll('.post-content p, .post-content li, .post-content blockquote, .xp-shell-main').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 80) return;
    const st = getComputedStyle(el);
    const fs2 = parseFloat(st.fontSize) || 16;
    out.measure.push({ cls: (typeof el.className==='string'?el.className:'').slice(0,34),
      w: Math.round(r.width), fs: fs2, chars: Math.round(r.width/fs2),
      lh: st.lineHeight, text: (el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,20) });
  });
  out.measure = out.measure.slice(0, 14);

  // 2) 标题层级
  out.headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => {
    const r = h.getBoundingClientRect();
    return { tag: h.tagName, text: h.textContent.trim().replace(/\\s+/g,' ').slice(0,26),
      visible: !!(r.width && r.height) && getComputedStyle(h).display !== 'none',
      fs: Math.round(parseFloat(getComputedStyle(h).fontSize)) };
  });

  // 3) 窗口标题栏：真实像素背景（渐变按标题栏中心点取样）
  out.titlebars = [...document.querySelectorAll('.xp-window-title')].slice(0,6).map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { text: (el.textContent||'').trim().slice(0,20), bgImage: cs.backgroundImage.slice(0,60),
      bgColor: cs.backgroundColor, color: cs.color, h: Math.round(r.height),
      fs: Math.round(parseFloat(cs.fontSize)) };
  });

  // 4) 固定/悬浮元素是否遮住可点内容
  out.overlaps = [];
  const floats = [...document.querySelectorAll('.xp-music-floating, .xp-taskbar, .retro-mp4-player, .xp-bubble, .xp-music-resume, #xp-restore-bar, .xp-decor')];
  const clickable = [...document.querySelectorAll('a[href],button,input')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 12 && r.height > 12 && r.top >= 0 && r.top < innerHeight && r.left >= 0 && r.left < innerWidth;
  });
  for (const f of floats) {
    const fr = f.getBoundingClientRect();
    if (fr.width < 4) continue;
    const fcs = getComputedStyle(f);
    if (fcs.display === 'none' || fcs.visibility === 'hidden' || +fcs.opacity === 0) continue;
    const hits = clickable.filter(el => {
      const r = el.getBoundingClientRect();
      const ox = Math.min(r.right, fr.right) - Math.max(r.left, fr.left);
      const oy = Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top);
      return ox > 4 && oy > 4;
    }).map(el => ({ tag: el.tagName.toLowerCase(),
      cls: (typeof el.className==='string'?el.className:'').slice(0,30),
      text: (el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,14) }));
    if (hits.length) out.overlaps.push({ float: (typeof f.className==='string'?f.className:'').slice(0,40),
      rect: [Math.round(fr.left),Math.round(fr.top),Math.round(fr.width),Math.round(fr.height)], hits });
  }

  // 5) 页面里第一个真正的标题元素（读者看到的「页面名」）
  out.pageTitleEls = [...document.querySelectorAll('.post-title-text, .xp-window-title-text, .page-title, h1, h2')].slice(0,6)
    .map(el => ({ tag: el.tagName, cls: (typeof el.className==='string'?el.className:'').slice(0,30),
      text: el.textContent.trim().replace(/\\s+/g,' ').slice(0,24),
      fs: Math.round(parseFloat(getComputedStyle(el).fontSize)),
      weight: getComputedStyle(el).fontWeight }));

  // 6) 页面 title 与可见标题是否一致（SEO/一致性）
  out.docTitle = document.title;

  return out;
})()`;

async function main() {
  const port = await findFreePort();
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--no-sandbox','--disable-crash-reporter',
    '--disable-breakpad','--disable-features=RendererCodeIntegrity',`--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,'--window-size=1200,900','about:blank'], { stdio: 'ignore' });
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
  const send = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({id:i,method,params:params||{}})); });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const all = {};
  for (const p of pages) {
    await send('Page.navigate', { url: base + p });
    await sleep(2600);
    const r = await send('Runtime.evaluate', { returnByValue: true, expression: PROBE });
    all[p] = (r.result && r.result.result && r.result.result.value) ? r.result.result.value : { error: 'n/a' };
  }
  fs.mkdirSync(path.join(__dirname,'..','..','.screenshots','.tmp'), { recursive: true });
  fs.writeFileSync(path.join(__dirname,'..','..','.screenshots','.tmp','type.json'), JSON.stringify(all,null,2),'utf8');
  for (const [p, v] of Object.entries(all)) {
    console.log('\n===== ' + p + ' =====');
    if (v.error) { console.log('ERR', v.error); continue; }
    console.log('doc.title: ' + v.docTitle);
    console.log('可见标题元素: ' + (v.pageTitleEls||[]).map(x=>x.tag+'.'+x.cls+'('+x.text+') '+x.fs+'px/'+x.weight).join(' | '));
    console.log('标题层级: ' + (v.headings||[]).map(h=>h.tag+(h.visible?'':'*')).join('>'));
    (v.headings||[]).forEach(h => { if (h.visible) console.log('    ' + h.tag + ' ' + h.fs + 'px "' + h.text + '"'); });
    console.log('每行字数: ' + (v.measure||[]).map(m=>m.cls+'='+m.chars+'字('+m.w+'px,lh:'+m.lh+')').join(', '));
    console.log('标题栏: ' + (v.titlebars||[]).map(t=>t.text+'['+t.color+' on '+t.bgColor+' grad:'+(t.bgImage.indexOf('gradient')>0?'yes':'no')+']').join(' | '));
    (v.overlaps||[]).forEach(o => console.log('遮挡: ' + o.float + ' ' + JSON.stringify(o.rect) + ' → ' + o.hits.map(h=>h.cls+'("'+h.text+'")').join(', ')));
  }
  ws.close(); proc.kill(); process.exit(0);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
