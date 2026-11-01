// pill-contrast.js — measure tag-pill contrast on a page
'use strict';
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:4010';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = path.join(process.env.TEMP, 'edge-pill-chk');
function httpGet(url) { return new Promise((res, rej) => http.get(url, r => { let d=''; r.on('data', c => d+=c); r.on('end', () => res(d)); }).on('error', rej)); }
let id = 0; const pend = new Map();
function lum(arr) { const m = arr.map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*m[0]+0.7152*m[1]+0.0722*m[2]; }
function ratio(fg,bg){ const a=lum(fg),b=lum(bg); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); }
(async () => {
  const child = spawn(EDGE, ['--headless=new','--disable-gpu','--no-sandbox','--disable-crash-reporter','--disable-breakpad','--disable-features=RendererCodeIntegrity',`--user-data-dir=${PROFILE}`,'--remote-debugging-port=9358','about:blank'], { stdio:'ignore' });
  await new Promise(r=>setTimeout(r,2500));
  const t = JSON.parse(await httpGet('http://127.0.0.1:9358/json/list')).find(x=>x.type==='page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  ws.onmessage = e => { const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);} };
  await new Promise(r=>ws.onopen=r);
  const send = (method,params={}) => new Promise(res => { const mid=++id; pend.set(mid,res); ws.send(JSON.stringify({id:mid,method,params})); });
  const ev = async (expression) => (await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.result?.value;
  await send('Page.enable');
  await send('Page.navigate',{url: BASE+'/works/'});
  await new Promise(r=>setTimeout(r,1800));
  const pills = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.tag-pill')].map(p=>({t:p.textContent.trim(),cls:p.className,c:getComputedStyle(p).color,b:getComputedStyle(p).backgroundColor})))`));
  for (const p of pills) {
    const fg = p.c.match(/\d+/g).map(Number);
    const bg = p.b.match(/\d+/g).map(Number);
    console.log(p.cls.replace('tag-pill','').trim(), p.t, ratio(fg,bg).toFixed(2)+':1');
  }
  ws.close(); try{process.kill(child.pid);}catch(e){}
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});