/* 设计体检 + 改后回归：一次跑完排版 / 对比度 / 命中区 / 溢出 / 地标 / 焦点，
 * 外加一组针对「2026-11-02 设计整改」的定点断言。
 *
 * 用法：node tools/check/audit-design.js [base] [outDir]
 *   base  默认 http://127.0.0.1:4010（先跑 npm run server）
 *   outDir 默认 .screenshots/.tmp/audit-design
 *
 * 依赖：tools/check/cdp.js（连无头 Edge）+ tools/check/_contrast-probe.js
 *      （渐变感知的对比度探针，被 audit-contrast.js 共用）。
 * Edge 本身由 tools/check/start-edge.ps1 起 —— DSH 沙箱里 Node 派生的
 * Edge 子进程拿不到 mojo 的 platform channel，起不来。
 *
 * 输出：outDir/audit-design.json + 屏幕摘要；退出码非 0 表示有断言失败。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { attach, goto, evaluate, viewport, shot, sleep } = require('./cdp');

const base = (process.argv[2] || 'http://127.0.0.1:4010').replace(/\/$/, '');
const outDir = process.argv[3] || path.join(__dirname, '..', '..', '.screenshots', '.tmp', 'audit-design');

const PAGES = [
  { p: '/', name: 'home' },
  { p: '/blog/', name: 'blog' },
  { p: '/works/', name: 'works' },
  { p: '/games/', name: 'games' },
  { p: '/archives/', name: 'archives' },
  { p: '/tags/', name: 'tags' },
  { p: '/categories/', name: 'categories' },
  { p: '/hello-world/', name: 'post' },
  { p: '/404.html', name: '404' },
];

const WIDTHS = [
  { w: 390, h: 844, mobile: true, tag: 'phone' },
  { w: 768, h: 1000, mobile: false, tag: 'tablet' },
  { w: 1280, h: 900, mobile: false, tag: 'desktop' },
  { w: 1600, h: 1000, mobile: false, tag: 'wide' },
];

/* ---------- 页面体检探针（在浏览器里跑） ---------- */
const PROBE = `(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const out = { vw, scrollW: de.scrollWidth, docH: de.scrollHeight, title: document.title };

  /* 横向溢出：只报越界的元素 */
  const over = [];
  document.querySelectorAll('body *').forEach((el) => {
    const st = getComputedStyle(el);
    if (st.position === 'fixed' || st.display === 'none' || st.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.right > vw + 1 || r.left < -1) {
      over.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
        l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width),
        txt: (el.textContent || '').trim().slice(0, 24),
      });
    }
  });
  out.overflowCount = over.length;
  out.overflow = over.slice(0, 12);

  /* 点击目标尺寸 */
  const taps = [];
  document.querySelectorAll('a,button,input,select,textarea,[role=button],[onclick],[tabindex]').forEach((el) => {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.width < 24 || r.height < 24) {
      taps.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 44),
        w: Math.round(r.width), h: Math.round(r.height),
        txt: (el.textContent || el.getAttribute('aria-label') || el.title || '').trim().slice(0, 20),
      });
    }
  });
  out.smallTargets = taps.length;
  out.smallTargetList = taps.slice(0, 20);

  /* 字号阶梯 */
  const type = [];
  const seen = new Set();
  const grab = (sel) => document.querySelectorAll(sel).forEach((el) => {
    const st = getComputedStyle(el);
    const k = el.tagName + '|' + st.fontSize + '|' + st.fontWeight + '|' + st.lineHeight + '|' + st.fontFamily.slice(0, 30);
    if (seen.has(k)) return; seen.add(k);
    type.push({
      sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
      fs: st.fontSize, lh: st.lineHeight, fw: st.fontWeight,
      ff: st.fontFamily.split(',')[0].replace(/["']/g, ''),
      txt: (el.textContent || '').trim().slice(0, 16),
    });
  });
  grab('p, li, .post-content *');
  grab('h1,h2,h3,h4,h5');
  grab('.post-info, .xp-window-title, .btn, button, .chip, .meta-chip, .tag, label, input, .aside-title, .xp-title');
  out.type = type.slice(0, 60);

  /* 语义 / 无障碍 */
  const imgs = [...document.querySelectorAll('img')];
  out.imgTotal = imgs.length;
  out.imgNoAlt = imgs.filter((i) => !i.hasAttribute('alt')).map((i) => (i.getAttribute('src') || '?').slice(-40));
  out.landmarks = ['header','nav','main','aside','footer','article','section','form']
    .map((t) => t + ':' + document.querySelectorAll(t).length).filter((s) => !s.endsWith(':0'));
  out.h1 = [...document.querySelectorAll('h1')].map((h) => (h.textContent || '').trim().slice(0, 28));

  const noName = [];
  document.querySelectorAll('a,button,input,select,textarea,[role=button]').forEach((el) => {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const name = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') ||
      el.getAttribute('alt') || (el.labels && el.labels[0] && el.labels[0].textContent) || '';
    if (!name.trim()) {
      noName.push({
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 44),
        href: (el.getAttribute('href') || '').slice(0, 40),
      });
    }
  });
  out.noAccessibleName = noName.length;
  out.noAccessibleNameList = noName.slice(0, 15);

  /* 正文行长：中文约 1 字 = 1em，据此算每行几个字 */
  const pc = document.querySelector('.post-content');
  if (pc) {
    const pr = pc.getBoundingClientRect();
    const ps2 = getComputedStyle(pc);
    const fs2 = parseFloat(ps2.fontSize) || 16;
    out.lineLength = {
      widthPx: Math.round(pr.width),
      fontSize: ps2.fontSize,
      charsPerLine: Math.round(pr.width / fs2),
    };
    /* 代码块：宽度利用率（空得有多离谱）
       注意 hexo 的高亮结构是 figure.highlight > table > td.code > pre > span.line，
       没有 <code> 元素，所以文字宽度要用 Range 量。 */
    const pres = [...document.querySelectorAll('.post-content pre')].slice(0, 3);
    out.codeBlocks = pres.map((pre) => {
      const fig = pre.closest('.highlight') || pre.parentElement;
      const box = fig.getBoundingClientRect();
      const walk = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
      let node, widest = 0;
      while ((node = walk.nextNode())) {
        const rg = document.createRange();
        rg.selectNodeContents(node);
        const w = rg.getBoundingClientRect().width;
        if (w > widest) widest = w;
      }
      return {
        boxW: Math.round(box.width),
        contentW: Math.round(widest),
        fillPct: box.width ? Math.round(widest / box.width * 100) : 0,
      };
    });
  }

  /* 固定浮层压住内容：算出重叠面积。
     2026-11-04：播放器已改成页内组件（.xp-music-slot / .xp-page-player），
     不再是 position:fixed，所以从浮层名单里移除；现在只剩任务栏与开始菜单。 */
  const overlays = [...document.querySelectorAll('.xp-taskbar, .xp-start-menu')];
  const occ = [];
  overlays.forEach((ov) => {
    const st = getComputedStyle(ov);
    if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return;
    const r = ov.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    /* 被盖住的元素：从内容区里挑可见的、非浮层自身 */
    const hits = [];
    document.querySelectorAll('.post-content *, .xp-post-card, .xp-bento *, .site-footer *, .xp-aside *').forEach((el) => {
      if (ov.contains(el) || el.contains(ov)) return;
      const es = getComputedStyle(el);
      if (es.display === 'none' || es.visibility === 'hidden') return;
      if (es.position === 'fixed') return;
      const e = el.getBoundingClientRect();
      if (e.width < 2 || e.height < 2) return;
      const w = Math.min(e.right, r.right) - Math.max(e.left, r.left);
      const h = Math.min(e.bottom, r.bottom) - Math.max(e.top, r.top);
      if (w > 0 && h > 0) {
        hits.push({
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
          area: Math.round(w * h),
          txt: (el.textContent || '').trim().slice(0, 20),
        });
      }
    });
    hits.sort((a, c) => c.area - a.area);
    occ.push({
      overlay: (typeof ov.className === 'string' ? ov.className : '').slice(0, 40),
      box: [Math.round(r.width), Math.round(r.height)],
      topHits: hits.slice(0, 4),
      totalArea: hits.reduce((s, h2) => s + h2.area, 0),
    });
  });
  out.overlayOcclusion = occ;

  /* 正文字号 / 行高 */
  const body = document.querySelector('.post-content') || document.querySelector('article') || document.body;
  const bs = getComputedStyle(body);
  out.bodyFont = bs.fontSize; out.bodyLH = bs.lineHeight;
  const p = document.querySelector('.post-content p');
  if (p) {
    const ps = getComputedStyle(p);
    out.pFont = ps.fontSize; out.pLH = ps.lineHeight; out.pMB = ps.marginBottom;
    out.pText = (p.textContent || '').trim().slice(0, 40);
  }
  out.postLinks = [...document.querySelectorAll('.post-content a')].length;

  /* 样式表里有没有 focus-visible / prefers-reduced-motion */
  out.hasFocusStyle = [...document.styleSheets].some((ss) => {
    try { return [...ss.cssRules].some((r) => (r.cssText || '').includes(':focus-visible')); } catch (e) { return false; }
  });
  out.hasPrefersReducedMotion = [...document.styleSheets].some((ss) => {
    try { return [...ss.cssRules].some((r) => (r.cssText || '').includes('prefers-reduced-motion')); } catch (e) { return false; }
  });

  return out;
})()`;

/* ---------- 焦点框探针：读当前焦点元素的 outline ---------- */
const FOCUS_PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { none: true };
  const st = getComputedStyle(el);
  /* 往上找第一个不透明背景，当作对比度参照 */
  let bg = null;
  let n = el;
  while (n && n !== document.documentElement) {
    const s = getComputedStyle(n);
    const m = s.backgroundColor.match(/rgba?\\(([^)]+)\\)/);
    if (m) {
      const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && (p.length < 4 || p[3] > 0.95)) { bg = [p[0], p[1], p[2]]; break; }
    }
    n = n.parentElement;
  }
  return {
    tag: el.tagName.toLowerCase(),
    cls: (typeof el.className === 'string' ? el.className : '').slice(0, 44),
    txt: (el.textContent || '').trim().slice(0, 24),
    focusVisible: false,
    outlineStyle: st.outlineStyle,
    outlineWidth: st.outlineWidth,
    outlineColor: st.outlineColor,
    outlineOffset: st.outlineOffset,
    bg: bg ? 'rgb(' + bg.join(',') + ')' : null,
  };
})()`;

/* ---------- 标题栏三按钮探针 ---------- */
const BUTTON_PROBE = `(() => {
  const bar = document.querySelector('.content-container > .xp-window-title') ||
              document.querySelector('.xp-window-title');
  if (!bar) return { skip: '这一页没有标题栏' };
  const shell = bar.parentElement;
  const out = {
    shellClass: shell ? shell.className : null,
    hasWindowAncestor: !!bar.closest('.xp-window'),
    count: bar.querySelectorAll('.xp-window-btn[data-action]').length,
    results: {},
  };
  const byAction = (a) => bar.querySelector('.xp-window-btn[data-action="' + a + '"]');
  const min = byAction('min'), max = byAction('max'), close = byAction('close');
  if (min) {
    min.click();
    out.results.minimize = shell.classList.contains('is-minimized');
    min.click();
    out.results.minimizeUndo = !shell.classList.contains('is-minimized');
  }
  if (max) {
    max.click();
    out.results.maximize = shell.classList.contains('is-maximized');
    out.results.maximizePosition = getComputedStyle(shell).position;
    max.click();
    out.results.maximizeUndo = !shell.classList.contains('is-maximized');
  }
  if (close) {
    close.click();
    out.results.close = shell.getAttribute('data-xp-closed') === '1';
    out.results.restoreChip = !!document.querySelector('.xp-restore-chip');
  }
  return out;
})()`;

/* ---------- 点赞 key 探针 ---------- */
const LIKE_PROBE = `(() => {
  const el = document.querySelector('[data-like-key]');
  if (!el) return { none: true };
  return { key: el.getAttribute('data-like-key') };
})()`;

/* ---------- 对比度探针（渐变感知，与 audit-contrast.js 共用同一份） ---------- */
const CONTRAST_PROBE = fs.readFileSync(path.join(__dirname, '_contrast-probe.js'), 'utf8');

/* ---------- Node 侧的小工具 ---------- */
const srgb = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2]);
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(s) {
  const m = String(s || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (p.length < 3) return null;
  return [p[0], p[1], p[2]];
}

/* 定点断言：每条一个 check */
const checks = [];
function check(id, name, ok, detail) {
  checks.push({ id, name, ok: !!ok, detail: detail == null ? '' : String(detail) });
}

async function pressTab(b, times) {
  for (let i = 0; i < (times || 1); i++) {
    await b.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await sleep(70);
  }
}

/* 静态检查：构建产物里的 CSS */
function staticCssChecks() {
  const pub = path.join(__dirname, '..', '..', 'public');
  const read = (rel) => {
    const f = path.join(pub, rel);
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  };
  const main = read('style/main.css');
  const xp = read('css/xp-custom.css');

  // ① 主题样式里不能再有 a:focus { outline: 0 }（会把全局 :focus-visible 顶掉）
  const themeOutline0 = main ? (main.match(/[^{}]*a:focus[^{}]*\{[^}]*outline\s*:\s*0/g) || []) : [];
  check('focus-1', '主题 CSS 不再把链接焦点框清零（a:focus{outline:0}）',
    themeOutline0.length === 0, themeOutline0.join(' | ') || '未发现');

  // ① 全局 :focus-visible 必须存在且有 ≥2px 的轮廓
  const fv = xp ? xp.match(/:focus-visible\{[^}]*\}/) : null;
  check('focus-2', '全局 :focus-visible 规则存在且 outline ≥ 2px',
    !!fv && /outline\s*:\s*(2px|[3-9]px|1\.[0-9]+rem|[2-9][0-9]*px)/.test(fv[0]),
    fv ? fv[0] : '没找到 :focus-visible');

  // ④ 三处换色落地
  check('contrast-1', '标题栏顶色已换成通过对比度的蓝（#1179c8）',
    !!xp && xp.indexOf('#1179c8') >= 0, xp ? '命中' : 'public/css/xp-custom.css 缺失');
  /* 这一条原本查「创作中」橙色标题栏有没有换成 #9c6520。
     2026-11-06 站主要求把那扇窗口的样式与其它窗口统一（去掉橙色栏、虚线框、
     半透明），橙色已经整条删掉了 —— 继续查 #9c6520 反而会永远失败。
     改成查「它确实已经和普通窗口一样」：产物里不再有 .work-window-card.upcoming，
     也没有 work-status 角标。 */
  check('contrast-2', '「创作中」窗口已与普通窗口统一（旧的特殊样式类名已消失）',
    !!xp && xp.indexOf('work-window-card') < 0,
    xp && xp.indexOf('work-window-card') < 0 ? '旧类名 0 命中' : '还剩 .work-window-card 相关样式');
  check('contrast-3', '开始按钮绿色已换（#328230）',
    !!xp && xp.indexOf('#328230') >= 0, xp ? '命中' : '缺失');

  // ④ 深色时间线链接必须有颜色
  const tl = xp ? xp.match(/\.xp-timeline-item a\{[^}]*\}/) : null;
  check('contrast-4', '深色模式下时间线链接有独立颜色（不再继承正文色）',
    !!tl && /color\s*:/.test(tl[0]), tl ? tl[0] : '没找到 .xp-timeline-item a');

  // ⑤ 外壳窗口状态 CSS（③ 的配套）
  check('win-1', '外壳（.content-container）的最小化/最大化/关闭状态样式已加',
    !!xp && /\.content-container\.is-minimized/.test(xp) && /\.content-container\.is-maximized/.test(xp) && /\.content-container\[data-xp-closed\]/.test(xp),
    'is-minimized / is-maximized / data-xp-closed');

  // ⑤ <main> 地标
  check('main-1', 'xp-custom.css 里给 <main class="xp-main"> 定了版式（不破坏 flex 列）',
    !!xp && /\.xp-main\s*\{[^}]*flex[^}]*\}/.test(xp), xp ? (xp.match(/\.xp-main\s*\{[^}]*\}/) || [''])[0] : '缺失');
}

/* 静态检查：构建产物里的 HTML */
function staticHtmlChecks() {
  const pub = path.join(__dirname, '..', '..', 'public');
  const walk = (dir, out) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p, out);
      else if (f.name.endsWith('.html')) out.push(p);
    }
    return out;
  };
  if (!fs.existsSync(pub)) return [];
  const files = walk(pub, []);
  let unbalanced = [], noMain = [];
  const stubs = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const rel = path.relative(pub, f).replace(/\\/g, '/');
    const open = (t.match(/<div\b/g) || []).length;
    const close = (t.match(/<\/div>/g) || []).length;
    if (open !== close) unbalanced.push(rel + ' (' + open + '/' + close + ')');
    const isStub = /http-equiv="refresh"/.test(t);
    if (!isStub && !/<main class="xp-main">/.test(t)) noMain.push(rel);
    if (isStub) stubs.push(rel);
  }
  check('html-1', '每个页面的 <div> 开闭配平（不再净少一个）',
    unbalanced.length === 0, unbalanced.join(' | ') || (files.length + ' 个页面全部配平'));
  check('html-2', '每个正文页都有 <main> 地标（跳转桩除外）',
    noMain.length === 0, noMain.join(' | ') || ('跳转桩 ' + stubs.length + ' 个，无 main 属正常'));

  // ⑦ 404 不再打印 %path%（只看正文标记，脚本注释里的说明不算）
  const f404 = path.join(pub, '404.html');
  if (fs.existsSync(f404)) {
    const t = fs.readFileSync(f404, 'utf8');
    const markup = t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    check('tools-1', '404 页正文不再出现字面量 %path%',
      markup.indexOf('%path%') < 0, markup.indexOf('%path%') < 0 ? '已替换为运行时路径' : '仍存在');
  }

  // ⑦ /tools/ 是轻量跳转桩
  const ftools = path.join(pub, 'tools', 'index.html');
  if (fs.existsSync(ftools)) {
    const t = fs.readFileSync(ftools, 'utf8');
    const kb = Math.round(Buffer.byteLength(t, 'utf8') / 1024 * 10) / 10;
    check('tools-2', '/tools/ 是轻量跳转桩（含 meta refresh + canonical + 可见链接）',
      /http-equiv="refresh"/.test(t) && /rel="canonical"/.test(t) && /<a href="\/games\/"/.test(t),
      kb + ' KB');
    check('tools-3', '/tools/ 体积已从 39 KB 降到 2 KB 以内', kb < 2, kb + ' KB');
  }

  /* 播放器页内化（2026-11-04 站主要求）：每个正文页恰好一个播放器，
     便当格页 / 侧栏页用竖排卡片，单栏页与没有侧栏的便当格页用底部横条。 */
  const LEGACY = ['xp-music-floating', 'xp-music-resume', 'mp4-collapsed', 'mp4-hidden'];
  let pCount = [], pLegacy = [], pAsideBar = [], pNoPlayer = [];
  const EXPECT_BAR = ['tags/index.html', 'categories/index.html', 'thanks/index.html',
    '404.html', 'works/index.html', 'games/index.html'];
  const barPages = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const rel = path.relative(pub, f).replace(/\\/g, '/');
    if (/http-equiv="refresh"/.test(t)) continue;
    const n = (t.match(/xp-music-slot/g) || []).length;
    if (n !== 1) pCount.push(rel + ' → ' + n);
    if (n === 0) pNoPlayer.push(rel);
    for (const cls of LEGACY) if (t.indexOf(cls) >= 0) pLegacy.push(rel + ' 含 ' + cls);
    if (/class="xp-music-slot is-bar"/.test(t)) barPages.push(rel);
    if (/class="xp-aside"/.test(t) && !/class="xp-music-slot is-card"/.test(t)) pAsideBar.push(rel);
  }
  check('player-1', '每个正文页恰好一个播放器（没有浮层残留、也没有重复）',
    pCount.length === 0, pCount.join(' | ') || (files.length - stubs.length) + ' 个页面各 1 个');
  check('player-2', '旧的浮层类名已从产物里彻底消失',
    pLegacy.length === 0, pLegacy.join(' | ') || LEGACY.join(' / ') + ' 均为 0 命中');
  check('player-3', '有侧栏的页面用竖排卡片（不出现底部横条）',
    pAsideBar.length === 0, pAsideBar.join(' | ') || '31 个侧栏页全部是卡片形态');
  check('player-4', '没有侧栏的页面用底部横条',
    EXPECT_BAR.every((r) => barPages.indexOf(r) >= 0) && barPages.length === EXPECT_BAR.length,
    barPages.join(' | ') || '无');
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await attach();
  const report = { base, generatedAt: new Date().toISOString(), widths: {}, contrast: {}, buttons: {}, focus: {}, likes: {} };

  try {
    for (const vp of WIDTHS) {
      report.widths[vp.tag] = {};
      for (const pg of PAGES) {
        await viewport(b, vp.w, vp.h, vp.mobile);
        /* 每页都清掉本地状态：播放器会把「已折叠/位置/大小」写进 localStorage，
           不清的话上一轮手机端测出来的折叠态会污染后面的桌面端测量
           （实测：手机轮把 xp_music_state_v1_c 写成 1，桌面轮就只量到 200×30 的
           收起条，而不是桌面真实的 200×300 展开态）。 */
        await evaluate(b, `try { localStorage.clear(); } catch (e) {}`);
        await goto(b, base + pg.p, 2000);
        const v = await evaluate(b, PROBE);
        report.widths[vp.tag][pg.name] = v;

        /* 截图必须排在交互探针前面 —— 标题栏按钮探针会真的关掉窗口，
           截图排在后面就只剩壁纸了。 */
        if (vp.tag === 'desktop' || vp.tag === 'phone') {
          await shot(b, path.join(outDir, `${pg.name}-${vp.tag}.png`), false);
        }

        if (vp.tag === 'desktop') {
          /* 对比度：浅色 + 深色（深色靠 html.dark class，站内没有媒体查询分支） */
          report.contrast[pg.name + ':light'] = await evaluate(b, CONTRAST_PROBE);
          await evaluate(b, `document.documentElement.classList.add('dark')`);
          await sleep(350);
          report.contrast[pg.name + ':dark'] = await evaluate(b, CONTRAST_PROBE);
          await evaluate(b, `document.documentElement.classList.remove('dark')`);

          /* 点赞 key */
          const lk = await evaluate(b, LIKE_PROBE);
          if (lk && !lk.none) report.likes[pg.name] = lk.key;

          /* 标题栏三按钮（会改变页面状态，放最后） */
          report.buttons[pg.name] = await evaluate(b, BUTTON_PROBE);
        }
      }
    }

    /* 焦点框：桌面宽度下连按 Tab，看真实键盘焦点有没有可见轮廓 */
    await viewport(b, 1280, 900, false);
    await evaluate(b, `try { localStorage.clear(); } catch (e) {}`);
    await goto(b, base + '/blog/', 2000);
    const focusSamples = [];
    for (let i = 0; i < 8; i++) {
      await pressTab(b, 1);
      const f = await evaluate(b, FOCUS_PROBE);
      if (f && !f.none) focusSamples.push(f);
    }
    report.focus.samples = focusSamples;

    /* 定点断言：焦点 */
    const withRing = focusSamples.filter((f) => f.outlineStyle && f.outlineStyle !== 'none' &&
      parseFloat(f.outlineWidth) >= 1);
    check('focus-3', '键盘 Tab 走过的焦点元素都有可见轮廓（≥1px）',
      focusSamples.length > 0 && withRing.length === focusSamples.length,
      focusSamples.length + ' 个焦点，其中 ' + withRing.length + ' 个有轮廓');

    const ringRatios = focusSamples.map((f) => {
      const oc = parseRgb(f.outlineColor), bg = parseRgb(f.bg);
      if (!oc || !bg) return null;
      return { cls: f.cls, r: Math.round(ratio(oc, bg) * 100) / 100 };
    }).filter(Boolean);
    const worstRing = ringRatios.length ? ringRatios.reduce((a, c) => (c.r < a.r ? c : a)) : null;
    check('focus-4', '焦点轮廓与底色的对比度 ≥ 3:1',
      !!worstRing && worstRing.r >= 3, worstRing ? worstRing.cls + ' = ' + worstRing.r + ':1' : '没有可测样本');
  } finally {
    await b.close();
  }

  /* 定点断言：标题栏按钮 */
  for (const [name, r] of Object.entries(report.buttons)) {
    if (!r || r.skip) continue;
    const res = r.results || {};
    check('btn-' + name, '/' + name + ' 的标题栏三按钮可用（最小化/最大化/关闭）',
      res.minimize === true && res.minimizeUndo === true &&
      res.maximize === true && res.maximizeUndo === true && res.close === true,
      'min=' + res.minimize + ' max=' + res.maximize + ' close=' + res.close +
      ' 恢复按钮=' + res.restoreChip + ' 外壳=' + r.shellClass);
  }

  /* 定点断言：点赞 key 不带双前缀 */
  const likeKeys = Object.entries(report.likes);
  const badLike = likeKeys.filter(([, k]) => k && k.indexOf('xp_like') === 0);
  check('like-1', '点赞存储键是文章原始路径（不再 xp_like:xp_like: 双前缀）',
    likeKeys.length > 0 && badLike.length === 0,
    likeKeys.length ? (likeKeys[0][1]) + '（' + likeKeys.length + ' 处）' : '页面上没有点赞按钮');

  /* 静态断言 */
  staticCssChecks();
  staticHtmlChecks();

  report.checks = checks;
  fs.writeFileSync(path.join(outDir, 'audit-design.json'), JSON.stringify(report, null, 2), 'utf8');

  /* ---- 摘要 ---- */
  console.log('written: ' + path.join(outDir, 'audit-design.json'));
  console.log('\n===== 页面体检（每个断点） =====');
  for (const [tag, pages] of Object.entries(report.widths)) {
    console.log('\n-- ' + tag);
    for (const [name, v] of Object.entries(pages)) {
      const bad = [];
      if (v.overflowCount) bad.push('overflow ' + v.overflowCount);
      if (v.smallTargets) bad.push('tiny-tap ' + v.smallTargets);
      if (v.noAccessibleName) bad.push('no-name ' + v.noAccessibleName);
      if (v.imgNoAlt && v.imgNoAlt.length) bad.push('img-no-alt ' + v.imgNoAlt.length);
      const lm = (v.landmarks || []).join(' ');
      console.log('   ' + name.padEnd(11) + ' vw=' + v.vw + ' scrollW=' + v.scrollW +
        ' | ' + (bad.join(' ') || 'ok') + ' | ' + lm);
    }
  }

  console.log('\n===== 对比度不达标（渐变感知探针） =====');
  let cf = 0;
  for (const [key, list] of Object.entries(report.contrast)) {
    if (!Array.isArray(list) || !list.length) continue;
    cf += list.length;
    console.log('-- ' + key);
    list.slice(0, 8).forEach((f) => console.log('   ' + f.ratio + ':1 (需 ' + f.need + ')  ' +
      f.tag + '.' + f.cls + '  ' + f.px + 'px  "' + f.t + '"  ' + f.color + ' on ' + f.bg));
  }
  if (!cf) console.log('（无）');

  console.log('\n===== 排版与浮层（只报告，不作为断言） =====');
  const desk = report.widths.desktop || {};
  for (const [name, v] of Object.entries(desk)) {
    if (!v || !v.lineLength) continue;
    console.log('-- ' + name + '  正文栏 ' + v.lineLength.widthPx + 'px / ' + v.lineLength.fontSize +
      ' → 约 ' + v.lineLength.charsPerLine + ' 个汉字一行（舒适区 30–45）');
    (v.codeBlocks || []).forEach((c) => console.log('   代码块 ' + c.boxW + 'px 宽，内容 ' + c.contentW +
      'px，利用率 ' + c.fillPct + '%'));
  }
  const occPages = Object.entries(desk).filter(([, v]) => v && v.overlayOcclusion && v.overlayOcclusion.some((o) => o.totalArea > 0));
  if (occPages.length) {
    console.log('-- 浮层压住内容：');
    for (const [name, v] of occPages) {
      v.overlayOcclusion.filter((o) => o.totalArea > 0).forEach((o) => {
        console.log('   ' + name + '  ' + o.overlay + ' ' + o.box.join('×') + ' → 覆盖 ' +
          o.totalArea + 'px²，最严重的：' + (o.topHits[0] ? o.topHits[0].cls + '「' + o.topHits[0].txt + '」' : '-'));
      });
    }
  } else {
    console.log('-- 浮层压住内容：没有');
  }

  console.log('\n===== 定点断言 =====');
  let failed = 0;
  for (const c of checks) {
    if (!c.ok) failed++;
    console.log((c.ok ? '  PASS  ' : '  FAIL  ') + c.id.padEnd(12) + c.name + (c.detail ? '   [' + c.detail + ']' : ''));
  }
  console.log('\n' + (checks.length - failed) + '/' + checks.length + ' 条断言通过' +
    (failed ? '，' + failed + ' 条失败' : ''));
  process.exit(failed ? 2 : 0);
})().catch((e) => {
  console.error('AUDIT FAIL:', (e && (e.stack || e.message)) || String(e));
  if (e && e.cause) console.error('CAUSE:', e.cause);
  process.exit(1);
});
