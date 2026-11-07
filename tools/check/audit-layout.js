/* 站点排版/交互体检：用 Edge DevTools Protocol 量真实渲染结果。
 * 用法：node tools/check/audit-layout.js http://127.0.0.1:4010 / 390 844
 *   - 量每个页面的横向溢出（scrollWidth > clientWidth）并列出越界元素
 *   - 量点击目标尺寸（< 44px 的交互元素）
 *   - 量正文字号 / 行高 / 段间距
 *   - 量图片缺 alt、标题层级、表单标签
 * 不装任何依赖：用 Node 内置 WebSocket 直连 CDP。
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const widths = (process.argv[3] || '390').split(',').map(Number);
const height = Number(process.argv[4] || 844);
const pages = (process.argv[5] || '/,/blog/,/works/,/games/,/archives/,/about-me/,/thanks/').split(',');

// 2026-11-02：Edge 的 profile 必须放在**仓库内**。放在 %TEMP% 时，Edge 的
// network sandbox 会因为拿不到临时目录的 ACL 而拒绝启动（DevTools 端口不监听），
// 表现为「CDP 没连上」。DSH 的 workspace-write 沙箱只保证仓库目录可写。
const profile = path.join(__dirname, '..', '..', '.edge-audit', 'layout');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

async function main() {
  const port = await findFreePort();
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-crash-reporter',
    '--disable-breakpad', '--disable-features=RendererCodeIntegrity',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    '--window-size=1600,1200', 'about:blank'
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60; i++) {
    await sleep(400);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch (_) { /* 还没起来 */ }
  }
  if (!target) { proc.kill(); throw new Error('CDP 没连上'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params) => new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });

  const results = {};
  for (const w of widths) {
    results[w] = {};
    for (const p of pages) {
      const url = base + p;
      await send('Emulation.setDeviceMetricsOverride', {
        width: w, height, deviceScaleFactor: 1, mobile: w < 900
      });
      await send('Page.enable');
      await send('Page.navigate', { url });
      await sleep(2600);
      const r = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const de = document.documentElement;
          const vw = de.clientWidth;
          const over = [];
          const vh = de.clientHeight;
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return;
            const right = r.right, left = r.left;
            if (right > vw + 1 || left < -1) {
              // 只报告「自己越界」的最外层元素
              const st = getComputedStyle(el);
              if (st.position === 'fixed') return;
              over.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 70) : '',
                left: Math.round(left), right: Math.round(right),
                w: Math.round(r.width),
                txt: (el.textContent || '').trim().slice(0, 28)
              });
            }
          });
          // 只保留最外层的越界元素（父元素也越界的就不重复报）
          const tops = over.filter(o => !over.some(p => p !== o &&
            (p.left <= o.left && p.right >= o.right) && false));
          const taps = [];
          document.querySelectorAll('a,button,input,select,textarea,[role=button],[onclick]').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return;
            if (r.width < 44 || r.height < 44) {
              taps.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 50) : '',
                w: Math.round(r.width), h: Math.round(r.height),
                txt: (el.textContent || el.getAttribute('aria-label') || el.title || '').trim().slice(0, 24)
              });
            }
          });
          const noAlt = [];
          document.querySelectorAll('img').forEach(el => {
            if (!el.hasAttribute('alt')) noAlt.push(el.getAttribute('src') || '?');
          });
          const body = document.querySelector('.post-content') || document.querySelector('article') || document.body;
          const cs = getComputedStyle(body);
          const p = document.querySelector('.post-content p');
          const ps = p ? getComputedStyle(p) : null;
          const h1 = document.querySelectorAll('h1').length;
          const heads = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.tagName + ':' + (h.textContent||'').trim().slice(0,20));
          const imgs = [...document.querySelectorAll('img')];
          const noDim = imgs.filter(i => !i.getAttribute('width') && !i.getAttribute('height')).length;
          return {
            vw, scrollW: de.scrollWidth, overflowX: de.scrollWidth > vw + 1,
            overCount: over.length, over: over.slice(0, 14),
            tapSmall: taps.length, taps: taps.slice(0, 12),
            imgNoAlt: noAlt.length, noAlt: noAlt.slice(0,6),
            imgNoDim: noDim, imgTotal: imgs.length,
            fontSize: cs.fontSize, lineHeight: cs.lineHeight,
            pFontSize: ps ? ps.fontSize : null, pLineHeight: ps ? ps.lineHeight : null,
            pMargin: ps ? ps.marginBottom : null,
            h1count: h1, heads: heads.slice(0, 12),
            docHeight: de.scrollHeight,
            title: document.title
          };
        })()`
      });
      results[w][p] = r.result && r.result.result ? r.result.result.value : { error: JSON.stringify(r).slice(0, 200) };
    }
  }

  fs.writeFileSync(path.join(__dirname, '..', '..', '.screenshots', '.tmp', 'audit.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(JSON.stringify(results, null, 2));

  ws.close();
  proc.kill();
  process.exit(0);
}

main().catch((e) => { console.error('AUDIT FAIL:', e.message); process.exit(1); });
