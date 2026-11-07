/* 定点查询：--xp-blue-border 深色取值、.menu 的可见性、搜索框可用性、
 * 404 页是否存在、prefers-reduced-motion 覆盖点数量。
 * 用法：node tools/check/audit-points.js <base>
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const profile = path.join(os.tmpdir(), 'dsh-points-edge');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

const PROBE = `(() => {
  const out = {};
  const rs = getComputedStyle(document.documentElement);
  out.blueBorder = rs.getPropertyValue('--xp-blue-border').trim();
  out.blue = rs.getPropertyValue('--xp-blue').trim();
  out.link = rs.getPropertyValue('--link').trim();
  out.textHeading = rs.getPropertyValue('--text-heading').trim();
  out.isDark = document.documentElement.classList.contains('dark');

  // 顶部导航 DOM 已于 2026-11-03 随主题瘦身删除（导航由任务栏开始菜单承担），
  // 所以这里改为报告它**不存在**：若哪天又冒出来，说明有人把顶栏加回去了。
  out.headerContainer = null;
  out.menu = null;
  const staleMenu = document.querySelector('.menu-list .menu, .site-header-container');
  if (staleMenu) {
    const cs = getComputedStyle(staleMenu);
    out.staleNav = { selector: staleMenu.className || staleMenu.tagName, display: cs.display };
  }

  // 搜索
  const si = document.querySelector('.xp-search-input');
  if (si) {
    const cs = getComputedStyle(si);
    out.search = { type: si.type, placeholder: si.placeholder, name: si.name, w: Math.round(si.getBoundingClientRect().width),
      h: Math.round(si.getBoundingClientRect().height), fs: cs.fontSize, color: cs.color, bg: cs.backgroundColor,
      hasForm: !!si.closest('form') };
    const lbl = document.querySelector('label[for="' + (si.id||'') + '"]');
    out.search.label = lbl ? lbl.textContent.trim() : null;
  }
  out.searchBtn = !!document.querySelector('.xp-search-btn');

  // prefers-reduced-motion
  out.reducedMotionRules = 0;
  try {
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const r of rules) {
        if (r.conditionText && /reduced-motion/.test(r.conditionText)) out.reducedMotionRules++;
        if (r.cssRules) for (const r2 of r.cssRules) if (r2.conditionText && /reduced-motion/.test(r2.conditionText)) out.reducedMotionRules++;
      }
    }
  } catch (e) {}

  // 动画总数（会动的元素）
  out.animated = 0;
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.animationName && cs.animationName !== 'none') out.animated++;
  });

  // 语言与 meta
  out.lang = document.documentElement.lang;
  out.metaDesc = (document.querySelector('meta[name="description"]')||{}).content;
  out.viewportMeta = (document.querySelector('meta[name="viewport"]')||{}).content;
  out.ogTitle = (document.querySelector('meta[property="og:title"]')||{}).content;
  out.themeColor = (document.querySelector('meta[name="theme-color"]')||{}).content;

  // 滚动条样式
  out.customScrollbar = [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.selectorText && /::-webkit-scrollbar/.test(r.selectorText)); } catch(e){ return false; } });

  // 触摸目标（只算真正可点的）
  out.small = [];
  document.querySelectorAll('a[href],button,input,select').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (r.width < 44 || r.height < 44) {
      out.small.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className==='string'?el.className:'').slice(0,34),
        w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,14) });
    }
  });
  out.smallCount = out.small.length;
  return out;
})()`;

async function main() {
  const port = await findFreePort();
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--no-sandbox','--disable-crash-reporter',
    '--disable-breakpad','--disable-features=RendererCodeIntegrity',`--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' });
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  for (const mode of ['light','dark']) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });
    for (const p of ['/','/blog/']) {
      await send('Page.navigate', { url: base + p });
      await sleep(2500);
      const r = await send('Runtime.evaluate', { returnByValue: true, expression: PROBE });
      const v = r.result && r.result.result && r.result.result.value;
      console.log('\n##### ' + mode + ' ' + p + ' #####');
      if (!v) { console.log('n/a'); continue; }
      console.log('dark=' + v.isDark + '  --xp-blue-border=' + v.blueBorder + '  --link=' + v.link + '  --text-heading=' + v.textHeading);
      console.log('menu: ' + JSON.stringify(v.menu) + '  headerContainer: ' + JSON.stringify(v.headerContainer));
      console.log('search: ' + JSON.stringify(v.search) + ' label=' + JSON.stringify(v.search && v.search.label) + ' btn=' + v.searchBtn);
      console.log('reduced-motion 媒体查询块=' + v.reducedMotionRules + '  有动画的元素=' + v.animated);
      console.log('lang=' + v.lang + '  theme-color=' + v.themeColor + '  自定义滚动条=' + v.customScrollbar);
      console.log('meta desc: ' + String(v.metaDesc).slice(0,80));
      console.log('小于 44px 的可点元素=' + v.smallCount);
      const agg = {};
      (v.small||[]).forEach(s => { const k = s.cls; agg[k] = agg[k] || {n:0,w:0,h:0,t:s.text}; agg[k].n++; agg[k].w = Math.max(agg[k].w,s.w); agg[k].h = Math.max(agg[k].h,s.h); });
      Object.entries(agg).sort((a,b)=>b[1].n-a[1].n).slice(0,14).forEach(([k,v2]) => console.log('    ' + v2.n + '× ' + k + ' 最大 ' + v2.w + '×' + v2.h + ' "' + v2.t + '"'));
    }
  }
  ws.close(); proc.kill(); process.exit(0);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
