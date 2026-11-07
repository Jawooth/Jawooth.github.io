/* 共用的 CDP 小工具：连上一个已经在跑的无头 Edge，取渲染结果。
 *
 * 为什么不自己 spawn Edge：
 *   DSH 的 workspace-write 沙箱里，Node 派生的子进程拿不到 mojo 的 platform
 *   channel（Access denied → Edge FATAL 起不来，DevTools 端口永远不监听），
 *   现象是「CDP 没连上」。PowerShell 的 Start-Process 走另一条路径，能起来。
 *   所以 Edge 由 tools/check/start-edge.ps1 起，端口写在 .edge-audit/port.txt，
 *   这里只负责连。
 *
 * 另外两个坑：
 *   1) Edge 的 profile 必须放在**仓库内**。放 %TEMP% 时 Edge 的 network sandbox
 *      拿不到临时目录的 ACL，进程启动即 FATAL。DSH 沙箱只保证仓库目录可写。
 *   2) Edge 已有实例在跑时，新起的进程会把 --remote-debugging-port 转发给旧实例
 *      —— 旧实例没这个端口，于是表现为「CDP 没连上」。start-edge.ps1 会先收掉
 *      残留的 msedge 进程。
 *
 * 用法：
 *   const { attach, goto, evaluate, shot } = require('./cdp');
 *   const b = await attach();             // 连 .edge-audit/port.txt 里的端口
 *   await goto(b, 'http://127.0.0.1:4010/');
 *   const v = await evaluate(b, 'document.title');
 *   await b.close();
 */
'use strict';

const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PORT_FILE = path.join(__dirname, '..', '..', '.edge-audit', 'port.txt');

function readPort() {
  if (!fs.existsSync(PORT_FILE)) {
    throw new Error('没找到 .edge-audit/port.txt —— 先跑 tools/check/start-edge.ps1');
  }
  const p = parseInt(fs.readFileSync(PORT_FILE, 'utf8').trim(), 10);
  if (!p) throw new Error('port.txt 内容不对');
  return p;
}

/** 连上已在跑的无头 Edge。 */
async function attach(port) {
  const p = port || readPort();
  let target = null;
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${p}/json/list`);
      const list = await r.json();
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch (_) { /* 还没起来 */ }
    await sleep(400);
  }
  if (!target) throw new Error(`CDP 没连上（端口 ${p}）`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = (ev) => rej(new Error('WebSocket 连不上: ' + (ev && ev.message ? ev.message : 'unknown error') +
      ' (ws=' + target.webSocketDebuggerUrl + ')'));
  });

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

  const browser = {
    port: p, send,
    async close() { try { ws.close(); } catch (_) {} },
  };
  await send('Page.enable');
  await send('Runtime.enable');
  return browser;
}


/** 打开一个 URL 并等它渲染完（等 networkIdle 近似 + 固定延时）。 */
async function goto(b, url, settleMs) {
  await b.send('Page.navigate', { url });
  await sleep(settleMs == null ? 2200 : settleMs);
}

/** 在当前页面里执行 JS，返回结构化结果。 */
async function evaluate(b, expression) {
  const r = await b.send('Runtime.evaluate', {
    returnByValue: true, awaitPromise: true, expression,
  });
  if (r.error) throw new Error('CDP: ' + JSON.stringify(r.error).slice(0, 300));
  /* 注意：exceptionDetails 在 r.result 里面，不在 r 上（踩过：页面抛错时
     evaluate 悄悄返回 undefined，后面赋值 report.x.afterY 直接 TypeError）。*/
  const details = r.result && r.result.exceptionDetails;
  const remote = r.result && r.result.result;
  if (details || (remote && remote.subtype === 'error')) {
    const d = details || {};
    const desc = (d.exception && (d.exception.description || d.exception.value)) ||
      (remote && remote.description) || d.text || 'unknown';
    throw new Error('页面里抛异常: ' + String(desc).slice(0, 500));
  }
  if (!r.result || !('result' in r.result)) {
    throw new Error('Runtime.evaluate 没拿到结果: ' + JSON.stringify(r).slice(0, 400));
  }
  return r.result.result ? r.result.result.value : null;
}

/** 模拟视口尺寸（真正的 device metrics override，比 --window-size 准）。 */
async function viewport(b, width, height, mobile) {
  await b.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: !!mobile,
  });
}

/** 截图落盘。 */
async function shot(b, file, fullPage) {
  const params = { format: 'png' };
  if (fullPage) params.captureBeyondViewport = true;
  const r = await b.send('Page.captureScreenshot', params);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  return file;
}

module.exports = { attach, goto, evaluate, viewport, shot, readPort, sleep };
