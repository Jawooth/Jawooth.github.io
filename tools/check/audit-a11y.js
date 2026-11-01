/* 交互与可访问性探针 v2：
 *   · 用 Emulation.setDeviceMetricsOverride 真正模拟 390px 视口（Windows 窗口宽度有下限，
 *     --window-size=390 实际拿到的是 479，之前那一版数据不可用）
 *   · 用真实 Tab 键（Input.dispatchKeyEvent）走焦点，检测可见焦点环
 *   · landmark / h1 / 无可访问名控件 / 溢出元凶 / 每行字数
 * 用法：node tools/check/audit-a11y.js <base> <width> <height> <pages>
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const width = parseInt(process.argv[3] || '390', 10);
const height = parseInt(process.argv[4] || '844', 10);
const pages = (process.argv[5] || '/,/blog/,/works/,/games/,/archives/,/about-me/,/thanks/,/hello-world/').split(',');
const profile = path.join(os.tmpdir(), 'dsh-a11y2-edge');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

const PROBE = `(() => {
  const out = {};
  out.viewport = document.documentElement.clientWidth;
  out.innerWidth = window.innerWidth;

  out.landmarks = ['header','nav','main','aside','footer','article','section','form'].map(t => ({
    tag: t, n: document.querySelectorAll(t).length
  })).filter(x => x.n > 0);
  out.h1 = [...document.querySelectorAll('h1')].map(h => {
    const r = h.getBoundingClientRect();
    return { text: h.textContent.trim().slice(0,30),
      visible: !!(r.width && r.height) && getComputedStyle(h).display !== 'none' };
  });
  out.headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName).join('>');

  out.namelessControls = [...document.querySelectorAll('a[href],button')].filter(el => {
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    return !name;
  }).map(el => ({
    tag: el.tagName.toLowerCase(),
    cls: (typeof el.className === 'string' ? el.className : '').slice(0,40),
    html: el.outerHTML.slice(0, 100)
  }));
  out.namelessCount = out.namelessControls.length;

  const vw = document.documentElement.clientWidth;
  out.overflowing = [];
  document.querySelectorAll('body *').forEach(el => {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const overRight = r.right - vw;
    const scrollOver = el.scrollWidth - el.clientWidth;
    if (overRight > 2 || scrollOver > 2) {
      out.overflowing.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0,46),
        overRight: Math.round(overRight), scrollOver: Math.round(scrollOver),
        overflow: st.overflowX, textOverflow: st.textOverflow,
        w: Math.round(r.width), text: (el.textContent || '').trim().replace(/\\s+/g,' ').slice(0,30)
      });
    }
  });
  out.overflowing = out.overflowing.slice(0, 40);

  const measure = [];
  document.querySelectorAll('.post-content p, .post-content li, .xp-post-desc, .post-card-desc, .xp-post-card-desc, .profile-text p, .xp-about p').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 60) return;
    const fs2 = parseFloat(getComputedStyle(el).fontSize);
    measure.push({ cls: (typeof el.className==='string'?el.className:'').slice(0,30), width: Math.round(r.width),
      fs: fs2, chars: Math.round(r.width / fs2), text: (el.textContent||'').trim().slice(0,16) });
  });
  out.measure = measure.slice(0, 12);

  out.fonts = [...document.fonts].filter(f => f.family && f.family.includes('Fusion'))
    .map(f => f.family + '/' + f.weight + '/' + f.status);

  // 命中测试：元素中心点是否被别的元素盖住（点击被拦截）
  out.hitBlocked = [];
  const els = [...document.querySelectorAll('a[href],button,input[type="text"],input[type="password"]')];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (!(r.width > 8 && r.height > 8)) continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const top = document.elementFromPoint(cx, cy);
    if (top && !el.contains(top) && !top.contains(el)) {
      out.hitBlocked.push({ tag: el.tagName.toLowerCase(),
        cls: (typeof el.className==='string'?el.className:'').slice(0,40),
        text: (el.textContent||'').trim().slice(0,18),
        blockedBy: top.tagName.toLowerCase() + '.' + (typeof top.className==='string'?top.className:'').slice(0,34) });
    }
  }
  out.hitBlocked = out.hitBlocked.slice(0, 20);
  return out;
})()`;

const FOCUS_PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const st = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    cls: (typeof el.className === 'string' ? el.className : '').slice(0,40),
    text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0,20),
    outlineStyle: st.outlineStyle, outlineWidth: st.outlineWidth, outlineColor: st.outlineColor,
    boxShadow: st.boxShadow === 'none' ? 'none' : 'set',
    borderColor: st.borderColor, bg: st.backgroundColor,
    w: Math.round(r.width), h: Math.round(r.height)
  };
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

  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 700
  });

  const all = {};
  for (const p of pages) {
    await send('Page.navigate', { url: base + p });
    await sleep(2500);
    const r = await send('Runtime.evaluate', { returnByValue: true, expression: PROBE });
    const v = (r.result && r.result.result && r.result.result.value) ? r.result.result.value : { error: 'n/a' };

    // 真实 Tab 遍历焦点
    await send('Runtime.evaluate', { expression: 'document.body.focus(); if(document.activeElement) document.activeElement.blur();' });
    const focusSeen = [];
    for (let i = 0; i < 45; i++) {
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, code: 'Tab', key: 'Tab' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, code: 'Tab', key: 'Tab' });
      await sleep(90);
      const fr = await send('Runtime.evaluate', { returnByValue: true, expression: FOCUS_PROBE });
      const f = fr.result && fr.result.result && fr.result.result.value;
      if (!f) continue;
      const hasRing = (f.outlineStyle !== 'none' && parseFloat(f.outlineWidth) > 0) || f.boxShadow !== 'none';
      focusSeen.push({ ...f, hasRing });
      if (focusSeen.length > 60) break;
    }
    v.focusTab = focusSeen;
    v.focusNoRing = focusSeen.filter(f => !f.hasRing);
    all[p] = v;
  }
  const outDir = path.join(__dirname,'..','..','.screenshots','.tmp');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir,'a11y.json'), JSON.stringify(all,null,2),'utf8');

  for (const [p, v] of Object.entries(all)) {
    console.log('\n===== ' + p + ' =====');
    if (v.error) { console.log('ERR', v.error); continue; }
    console.log('viewport=' + v.viewport + '  landmarks: ' + (v.landmarks||[]).map(l=>l.tag+'×'+l.n).join(' '));
    console.log('h1: ' + JSON.stringify(v.h1));
    console.log('heading order: ' + (v.headings||'').slice(0,80));
    console.log('无名控件=' + v.namelessCount + (v.namelessControls && v.namelessControls.length ? ' → ' + v.namelessControls.slice(0,4).map(x=>x.tag+'.'+x.cls).join(' | ') : ''));
    console.log('焦点(Tab)=' + (v.focusTab||[]).length + ' 其中无焦点环=' + (v.focusNoRing||[]).length);
    if (v.focusNoRing && v.focusNoRing.length) console.log('   → ' + v.focusNoRing.slice(0,8).map(x=>x.tag+'.'+x.cls+'("'+x.text+'")'+x.w+'×'+x.h).join(' | '));
    console.log('overflow(vw=' + v.viewport + '): ' + (v.overflowing||[]).length);
    (v.overflowing||[]).slice(0,12).forEach(o => console.log('   +'+o.overRight+'px/'+o.scrollOver+'px  '+o.tag+'.'+o.cls+' w'+o.w+' ovx:'+o.overflow+' "'+o.text+'"'));
    if (v.hitBlocked && v.hitBlocked.length) { console.log('点击被遮挡: ' + v.hitBlocked.length); v.hitBlocked.slice(0,8).forEach(h=>console.log('   '+h.tag+'.'+h.cls+'("'+h.text+'") ← '+h.blockedBy)); }
    if (v.measure && v.measure.length) console.log('每行字数: ' + v.measure.map(m=>m.cls+'='+m.chars+'字/'+m.width+'px').join(', '));
    if (v.fonts && v.fonts.length) console.log('字体: ' + v.fonts.join(' | '));
  }
  ws.close(); proc.kill(); process.exit(0);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
