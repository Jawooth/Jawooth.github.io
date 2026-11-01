/* 对比度探针（浏览器端，注入到页面里跑）
 *
 * 这个文件是给 tools/check/audit-contrast.js 用的，不要单独运行。
 * 抽出来单独放，是因为早期版本把这段代码内联在 Node 的模板字符串里，
 * 转义（\ 与 ${}）老出错，单独一个纯 JS 文件最省心。
 *
 * ★ 关键点：背景要算「渐变」。
 *   早期版本只读 backgroundColor，遇到 background-image 是渐变（标题栏、任务栏、
 *   便利贴纸、MP4 屏幕）的元素就一路 fallback 到 body 的底色，
 *   报出来的比值是错的（1.0~1.3:1 这种离谱数字）。
 *   现在改成：把祖先链上的每一层背景都解析出来，
 *   渐变按「文字实际所在位置」取色（linear 按投影位置插值，radial 按到中心的相对半径），
 *   再按 alpha 一层层合成，最后对所有候选底色取最差比值（保守）。
 */
(() => {
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const ratio = (a, b) => {
    const l1 = lum([a.r, a.g, a.b]), l2 = lum([b.r, b.g, b.b]);
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  };
  const parseColor = s => {
    if (!s) return null;
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1
  });
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, t) => ({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t
  });

  /* 按顶层逗号切分（括号内的逗号不算） */
  const splitTop = s => {
    const out = []; let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };

  /* 解析渐变色标：['rgb(1,2,3) 0%', 'rgb(4,5,6) 55%', ...] */
  const parseStops = parts => {
    const raw = [];
    parts.forEach((p, i) => {
      const m = p.match(/^(rgba?\([^)]*\))\s*(.*)$/);
      if (!m) return;
      const c = parseColor(m[1]);
      if (!c) return;
      const pm = m[2].match(/(-?[\d.]+)%/);
      raw.push({ c, pos: pm ? parseFloat(pm[1]) / 100 : null, i });
    });
    if (!raw.length) return [];
    /* 没写位置就按顺序均分 */
    const known = raw.filter(s => s.pos !== null);
    if (!known.length) { raw.forEach((s, i) => { s.pos = raw.length === 1 ? 0 : i / (raw.length - 1); }); return raw; }
    let prev = 0;
    raw.forEach(s => {
      if (s.pos === null) {
        /* 落在前后两个已知色标之间 */
        let next = 1;
        for (let i = raw.indexOf(s) + 1; i < raw.length; i++) if (raw[i].pos !== null) { next = raw[i].pos; break; }
        s.pos = (prev + next) / 2;
      } else prev = s.pos;
    });
    return raw.sort((a, b) => a.pos - b.pos);
  };

  const sampleStops = (stops, t) => {
    if (!stops.length) return null;
    if (t <= stops[0].pos) return stops[0].c;
    const last = stops[stops.length - 1];
    if (t >= last.pos) return last.c;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].pos) {
        const a = stops[i - 1], b = stops[i];
        const span = b.pos - a.pos;
        return lerp(a.c, b.c, span <= 0 ? 0 : (t - a.pos) / span);
      }
    }
    return last.c;
  };

  /* linear-gradient：按角度把文字中心投影到渐变线上，取该处颜色 */
  const evalLinear = (stops, angleDeg, rect, point) => {
    const rad = angleDeg * Math.PI / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);   /* 屏幕坐标 y 向下 */
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const len = Math.abs(rect.width * dx) + Math.abs(rect.height * dy) || 1;
    const t = ((point.x - cx) * dx + (point.y - cy) * dy) / len + 0.5;
    return sampleStops(stops, clamp01(t));
  };

  /* radial-gradient：按文字中心到渐变中心的相对半径取色 */
  const evalRadial = (stops, rect, point, at, rx, ry) => {
    const cx = rect.left + rect.width * at.x, cy = rect.top + rect.height * at.y;
    const halfW = (rect.width / 2) * rx, halfH = (rect.height / 2) * ry;
    const dx = (point.x - cx) / (halfW || 1), dy = (point.y - cy) / (halfH || 1);
    return sampleStops(stops, clamp01(Math.sqrt(dx * dx + dy * dy)));
  };

  /* 一个元素自己的背景层：渐变（渐变画在 background-color 之上）或纯色 */
  const layerColors = (el, point) => {
    const st = getComputedStyle(el);
    const bi = st.backgroundImage;
    if (bi && bi !== 'none') {
      const first = splitTop(bi)[0] || '';
      const inner = first.slice(first.indexOf('(') + 1, first.lastIndexOf(')'));
      const parts = splitTop(inner);
      if (first.startsWith('linear-gradient') && parts.length) {
        let angle = 180, stopParts = parts;
        const d = parts[0].toLowerCase().replace(/\s+/g, ' ');
        if (d.startsWith('to ')) {
          angle = d === 'to top' ? 0 : d === 'to right' ? 90 : d === 'to left' ? 270 : 180;
          stopParts = parts.slice(1);
        } else if (/^-?[\d.]+deg$/.test(parts[0].trim())) {
          angle = parseFloat(parts[0]); stopParts = parts.slice(1);
        }
        const stops = parseStops(stopParts);
        const c = evalLinear(stops, angle, el.getBoundingClientRect(), point);
        if (c) return [c];
      } else if (first.startsWith('radial-gradient') && parts.length) {
        let at = { x: 0.5, y: 0.5 }, rx = 1, ry = 1, stopParts = parts.slice();
        const atIdx = stopParts.findIndex(p => /(^|\s)at\s/i.test(p));
        if (atIdx >= 0) {
          const p = stopParts[atIdx].match(/at\s+([\d.]+)%\s+([\d.]+)%/);
          if (p) at = { x: parseFloat(p[1]) / 100, y: parseFloat(p[2]) / 100 };
          stopParts.splice(atIdx, 1);
        }
        const size = stopParts[0].match(/^([\d.]+)%\s+([\d.]+)%$/);
        if (size) { rx = parseFloat(size[1]) / 100; ry = parseFloat(size[2]) / 100; stopParts.shift(); }
        const stops = parseStops(stopParts);
        const c = evalRadial(stops, el.getBoundingClientRect(), point, at, rx, ry);
        if (c) return [c];
      }
    }
    const bc = parseColor(st.backgroundColor);
    if (bc && bc.a > 0) return [bc];
    return [];
  };

  /* 祖先链上所有背景层，按 alpha 从下往上合成 */
  const bgCandidates = el => {
    const r = el.getBoundingClientRect();
    const point = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const chain = [];
    let e = el;
    while (e && e !== document.documentElement) {
      const cands = layerColors(e, point);
      if (cands.length) chain.push(cands);
      e = e.parentElement;
    }
    const bodyC = layerColors(document.body, point);
    if (bodyC.length) chain.push(bodyC);

    /* 最底下那层不透明色当底 */
    let base = { r: 255, g: 255, b: 255, a: 1 }, start = -1;
    for (let i = chain.length - 1; i >= 0; i--) {
      const op = chain[i].find(c => c.a >= 0.999);
      if (op) { base = op; start = i; break; }
    }
    let cur = [base];
    for (let i = (start < 0 ? chain.length - 1 : start - 1); i >= 0; i--) {
      const next = [];
      for (const below of cur) {
        for (const c of chain[i]) {
          next.push(c.a >= 0.999 ? c : over(c, below));
          if (next.length > 48) break;
        }
        if (next.length > 48) break;
      }
      cur = next.slice(0, 48);
    }
    return cur.length ? cur : [base];
  };

  const out = [];
  const seen = new Set();
  document.querySelectorAll('body *').forEach(el => {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'RECT', 'G', 'USE', 'DEFS', 'SYMBOL', 'BR', 'IMG'].includes(el.tagName)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (!txt) return;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.opacity === '0') return;
    const fg = parseColor(st.color);
    if (!fg) return;
    const px = parseFloat(st.fontSize);
    const bold = parseInt(st.fontWeight, 10) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const cands = bgCandidates(el);
    /* 对所有候选底色取最差（渐变哪一段最不利就算哪一段） */
    let worst = null;
    for (const bg of cands) {
      const c = ratio(over(fg, bg), bg);
      if (!worst || c < worst.r) worst = { r: c, bg };
    }
    if (!worst) return;
    const key = st.color + '|' + Math.round(worst.bg.r) + ',' + Math.round(worst.bg.g) + ',' + Math.round(worst.bg.b) + '|' + Math.round(px);
    if (seen.has(key)) return;
    seen.add(key);
    if (worst.r < need) {
      out.push({
        t: txt.slice(0, 26),
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 44),
        tag: el.tagName.toLowerCase(),
        color: st.color,
        bg: 'rgb(' + Math.round(worst.bg.r) + ',' + Math.round(worst.bg.g) + ',' + Math.round(worst.bg.b) + ')',
        px: Math.round(px),
        ratio: +worst.r.toFixed(2),
        need
      });
    }
  });
  out.sort((a, b) => a.ratio - b.ratio);
  return out.slice(0, 25);
})()
