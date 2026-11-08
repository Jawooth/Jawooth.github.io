/* 对比度体检：对每个页面采样实际渲染出来的文字前景色与背景色，算 WCAG 对比度。
 * 用法：node tools/check/audit-contrast.js http://127.0.0.1:4010
 * 同时输出：深色模式下的采样。
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const base = process.argv[2] || 'http://127.0.0.1:4010';
const pages = (process.argv[3] || '/,/blog/,/works/,/games/,/archives/,/about-me/,/thanks/,/writing-reference/').split(',');
const profile = path.join(os.tmpdir(), 'dsh-contrast-edge');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findFreePort() {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

/* 浏览器端探针单独放一个文件（_contrast-probe.js），
   原因：内联进 Node 模板字符串时 \ 与 ${} 的转义老出错。
   探针本身是渐变感知的 —— 标题栏/任务栏/便利贴纸/MP4 屏幕的背景都是渐变，
   只读 backgroundColor 会把底色算错，报出 1.0~1.3:1 这种离谱的假阳性。 */
const PROBE = fs.readFileSync(path.join(__dirname, '_contrast-probe.js'), 'utf8');

async function main() {
  const port = await findFreePort();
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--no-sandbox','--disable-crash-reporter',
    '--disable-breakpad','--disable-features=RendererCodeIntegrity',`--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,'--window-size=1440,1200','about:blank'], { stdio: 'ignore' });

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

  const all = {};
  for (const mode of ['light', 'dark']) {
    all[mode] = {};
    /* ⚠ 深色必须用 html.dark class 驱动：站内深色由 head.ejs 的内联脚本按
       localStorage['use-color-scheme'] + matchMedia 切换 class，任务栏按钮也只切
       class；CSS 里没有 prefers-color-scheme 媒体查询分支。
       所以用 Emulation.setEmulatedMedia 测「深色」是测不出来的（2026-11-01 踩过）。
       这里直接在页面上加/去 class。 */
    for (const p of pages) {
      await send('Page.navigate', { url: base + p });
      await sleep(2400);
      await send('Runtime.evaluate', {
        expression: mode === 'dark'
          ? "document.documentElement.classList.add('dark')"
          : "document.documentElement.classList.remove('dark')"
      });
      await sleep(250);
      const r = await send('Runtime.evaluate', { returnByValue: true, expression: PROBE });
      all[mode][p] = (r.result && r.result.result) ? r.result.result.value : { error: 'n/a' };
    }
  }
  fs.writeFileSync(path.join(__dirname,'..','..','.screenshots','.tmp','contrast.json'), JSON.stringify(all,null,2),'utf8');
  for (const mode of Object.keys(all)) {
    console.log('\n######## ' + mode.toUpperCase() + ' ########');
    for (const [p, list] of Object.entries(all[mode])) {
      if (!Array.isArray(list) || !list.length) { console.log('-- ' + p + ': 通过'); continue; }
      console.log('-- ' + p + ' (' + list.length + ' 处不达标)');
      list.slice(0, 8).forEach(v => console.log('   ' + v.ratio + ':1 (需 ' + v.need + ')  ' + v.tag + '.' + v.cls + '  ' + v.px + 'px  "' + v.t + '"  ' + v.color + ' on ' + v.bg));
    }
  }
  ws.close(); proc.kill(); process.exit(0);
}
main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
