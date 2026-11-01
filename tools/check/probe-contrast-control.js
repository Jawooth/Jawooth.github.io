/* 对比度探针的「阳性对照」：故意往页面上塞几处明知不合格的颜色，
 * 看新探针（渐变感知）能不能把它们抓出来。
 *
 * 目的：上一轮审计报「全通过」，但一个永远返回 0 的探针也会「全通过」。
 * 这个对照脚本用来证明探针还有效。
 *
 * 用法：node tools/check/probe-contrast-control.js http://127.0.0.1:4010
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const profile = path.join(os.tmpdir(), 'dsh-contrast-control');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

const PROBE = fs.readFileSync(path.join(__dirname, '_contrast-probe.js'), 'utf8');

/* 故意做坏：① 灰字压浅底 ② 白字压浅黄渐变 ③ 白字压近黑渐变 */
const BREAK = `
  const s = document.createElement('style');
  s.textContent = [
    '.contrast-ctl-a { position:fixed; left:20px; top:20px; width:300px; height:40px;',
    '  background:#f0f0f0; color:#cccccc; font-size:16px; z-index:99999; }',
    '.contrast-ctl-b { position:fixed; left:20px; top:80px; width:300px; height:40px;',
    '  background:linear-gradient(180deg,#fff8b5 0%,#f6e78a 100%); color:#ffffff; font-size:16px; z-index:99999; }',
    '.contrast-ctl-c { position:fixed; left:20px; top:140px; width:300px; height:40px;',
    '  background:radial-gradient(120% 90% at 50% 30%, #232323 0%, #0d0d0d 100%); color:#ffffff; font-size:16px; z-index:99999; }'
  ].join('');
  document.head.appendChild(s);
  const mk = (cls, txt) => { const d = document.createElement('div');
    d.className = cls; d.textContent = txt; document.body.appendChild(d); };
  mk('contrast-ctl-a', '对照A 浅底浅灰字');
  mk('contrast-ctl-b', '对照B 黄渐变白字');
  mk('contrast-ctl-c', '对照C 近黑渐变白字');
`;

/* 注意：探针文件是 `注释 + 换行 + (()=>{...})()`，直接拼在 `return` 后面会被
 * ASI 解析成 `return;`（返回 undefined）。所以必须用赋值语句接。 */
const WRAP = `(() => { ${BREAK} const __ctl = ${PROBE}; return __ctl; })()`;

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

  await send('Page.navigate', { url: base + '/' });
  await sleep(2600);
  const r = await send('Runtime.evaluate', { returnByValue: true, expression: WRAP });
  const list = r.result && r.result.result ? r.result.result.value : null;
  if (!Array.isArray(list)) { console.log('探针没返回数组：', JSON.stringify(r).slice(0, 500)); ws.close(); proc.kill(); process.exit(1); }

  const ctl = list.filter(v => v.cls.includes('contrast-ctl'));
  console.log('探针共报出 ' + list.length + ' 处不达标，其中对照组命中 ' + ctl.length + ' 处：');
  ctl.forEach(v => console.log('  ' + v.cls + '  ' + v.ratio + ':1 (需 ' + v.need + ')  "' + v.t + '"  ' + v.color + ' on ' + v.bg));
  console.log('\n期望：A 应被抓出（#cccccc on #f0f0f0 ≈ 1.6:1）；B/C 若抓出则说明渐变取色生效。');
  const gotA = ctl.some(v => v.cls.includes('contrast-ctl-a'));
  console.log(gotA ? '✅ 阳性对照成立：探针能抓到真实的不合格项。' : '❌ 阳性对照失败：探针抓不到故意做坏的项，审计结果不可信！');
  ws.close(); proc.kill(); process.exit(gotA ? 0 : 1);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
