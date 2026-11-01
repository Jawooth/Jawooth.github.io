// IconPark SVG（曲线/圆弧，48×48，多 path 多色）→ 16×16 多色点阵
// 与 decode-pixelarticons.js 的「矩形解析」不同：IconPark 含 C/Q/A 曲线和 circle 等元素，
// 不能解析成矩形——改用浏览器无关的逐点采样：把 body 内所有绘制元素用 color 分层，
// 对每个 16×16 像素中心做点内测试（ray casting for path + 解析几何 for circle/rect/line）。
//
// 可行性依据：IconPark path 虽含曲线，但描边风格图标主要是「线」的集合。
// 直接做矢量点内测试需要 flatten 曲线（de Casteljau），工作量可控。
// 简化策略（v1）：不区分描边/填充几何，把每个 path 按 fill 色做 ray-cast 点内测试；
// stroke 路径（fill="none" stroke=色）转成「描边采样」：对 path 采样密集点集，
// 每个采样点向 16×16 网格投影，线宽 4/48*16≈1.33 → 投影到 1px，处附近格染色。
// 结果可能不如几何解析精确，但作为预览足够；后续可换 resvg/sharp 精确光栅化。
const fs = require('fs');
const path = require('path');
const park = require('@iconify-json/icon-park/icons.json');

// ---------- path 采样：把 path d 解析成密集点折线（flatten 全部指令） ----------
function samplePath(d, step = 0.25) {
  // 支持 M m L l H h V v C c S s Q q T t A a Z z（A 做圆弧近似：采样两端插值）
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  let i = 0;
  const next = () => parseFloat(tokens[i++]);
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let px = 0, py = 0; // 上个二次贝塞尔控制点（T 用）
  const pts = [];
  const emit = (x, y) => { pts.push([x, y]); cx = x; cy = y; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const cubic = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [
      u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
      u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
    ];
  };
  const quad = (p0, p1, p2, t) => {
    const u = 1 - t;
    return [
      u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0],
      u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1],
    ];
  };
  // 长直线段中间插值（步长 step），否则 stroke 投影只染两端
  const line = (x0, y0, x1, y1) => {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let k = 1; k <= n; k++) emit(lerp(x0, x1, k / n), lerp(y0, y1, k / n));
  };
  while (i < tokens.length) {
    const t = tokens[i++];
    if (t === 'M' || t === 'm') {
      let x = next(), y = next();
      if (t === 'm') { x += cx; y += cy; }
      sx = x; sy = y; emit(x, y);
      // 隐式后续 L
      while (i < tokens.length && /^-?\d/.test(tokens[i])) { line(cx, cy, next(), next()); }
    } else if (t === 'L' || t === 'l') {
      do {
        let x = next(), y = next();
        if (t === 'l') { x += cx; y += cy; }
        line(cx, cy, x, y);
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 'H' || t === 'h') {
      do {
        let x = next();
        if (t === 'h') x += cx;
        line(cx, cy, x, cy);
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 'V' || t === 'v') {
      do {
        let y = next();
        if (t === 'v') y += cy;
        line(cx, cy, cx, y);
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 'C' || t === 'c') {
      do {
        const p0 = [cx, cy];
        let x1 = next(), y1 = next(), x2 = next(), y2 = next(), x = next(), y = next();
        if (t === 'c') { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
        const n = Math.max(2, Math.ceil(Math.hypot(x - cx, y - cy) / step));
        for (let k = 1; k <= n; k++) {
          const [qx, qy] = cubic(p0, [x1, y1], [x2, y2], [x, y], k / n);
          emit(qx, qy);
        }
        px = x2; py = y2;
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 's' || t === 'S') {
      do {
        const p0 = [cx, cy];
        let x2 = next(), y2 = next(), x = next(), y = next();
        let x1, y1;
        if (t === 's') { x2 += cx; y2 += cy; x += cx; y += cy; }
        x1 = 2 * cx - px; y1 = 2 * cy - py; // 反射控制点
        const n = Math.max(2, Math.ceil(Math.hypot(x - cx, y - cy) / step));
        for (let k = 1; k <= n; k++) {
          const [qx, qy] = cubic(p0, [x1, y1], [x2, y2], [x, y], k / n);
          emit(qx, qy);
        }
        px = x2; py = y2;
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 'Q' || t === 'q') {
      do {
        const p0 = [cx, cy];
        let x1 = next(), y1 = next(), x = next(), y = next();
        if (t === 'q') { x1 += cx; y1 += cy; x += cx; y += cy; }
        const n = Math.max(2, Math.ceil(Math.hypot(x - cx, y - cy) / step));
        for (let k = 1; k <= n; k++) {
          const [qx, qy] = quad(p0, [x1, y1], [x, y], k / n);
          emit(qx, qy);
        }
        px = x1; py = y1;
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 't' || t === 'T') {
      do {
        const p0 = [cx, cy];
        let x = next(), y = next();
        if (t === 't') { x += cx; y += cy; }
        const x1 = 2 * cx - px, y1 = 2 * cy - py;
        const n = Math.max(2, Math.ceil(Math.hypot(x - cx, y - cy) / step));
        for (let k = 1; k <= n; k++) {
          const [qx, qy] = quad(p0, [x1, y1], [x, y], k / n);
          emit(qx, qy);
        }
        px = x1; py = y1;
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 'A' || t === 'a') {
      // 圆弧：用终点弦 + 半径近似为半圆采样（IconPark 弧多用在小圆角，误差可接受）
      do {
        let r1 = next(), r2 = next(), rot = next(), laf = next(), sf = next(), x = next(), y = next();
        if (t === 'a') { x += cx; y += cy; }
        const n = Math.max(4, Math.ceil(Math.hypot(x - cx, y - cy) / step));
        for (let k = 1; k <= n; k++) {
          const tt = k / n;
          // 线性插值 + 垂直偏移近似弧
          const mx = lerp(cx, x, tt), my = lerp(cy, y, tt);
          const bulge = Math.sin(Math.PI * tt) * r1 * 0.5 * (laf ? 1 : 0.4);
          const dx = x - cx, dy = y - cy;
          const len = Math.hypot(dx, dy) || 1;
          emit(mx + (-dy / len) * bulge * (sf ? 1 : -1), my + (dx / len) * bulge * (sf ? 1 : -1));
        }
      } while (i < tokens.length && /^-?\d/.test(tokens[i]));
    } else if (t === 'z' || t === 'Z') {
      emit(sx, sy);
    } else {
      // 未知 token，跳过一个数字防死循环
      i++;
    }
  }
  return pts;
}

// 检测 path 是否为「贝塞尔近似圆」（IconPark 常用 4 段 C 曲线画圆）：
// d = M x,y (C ...)*4 Z，端点/控制点关于中心对称 → 提取解析圆 (cx,cy,r)
function detectCirclePath(d) {
  const tokens = d.trim().match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d+(\.\d+)?/g);
  if (!tokens) return null;
  // 只处理 M + n×C + Z（n=2..6，4 最常见）；C 段必须是绝对坐标 6 参数
  if (tokens[0] !== 'M' || tokens[tokens.length - 1].toUpperCase() !== 'Z') return null;
  const segs = [];
  let i = 3; // 跳过 M 及其坐标对 (M x y)
  while (i < tokens.length - 1) {
    if (tokens[i] !== 'C') return null;
    const args = [];
    for (let k = 0; k < 6; k++) { args.push(parseFloat(tokens[i + 1 + k])); if (isNaN(args[k])) return null; }
    segs.push(args);
    i += 7;
  }
  if (segs.length < 2 || segs.length > 6) return null;
  // 收集所有端点与控制点，估计外接框
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const c of segs) {
    for (let k = 0; k < 6; k += 2) {
      minX = Math.min(minX, c[k]); maxX = Math.max(maxX, c[k]);
      minY = Math.min(minY, c[k + 1]); maxY = Math.max(maxY, c[k + 1]);
    }
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const rx = (maxX - minX) / 2, ry = (maxY - minY) / 2;
  // 圆判定：rx/ry 接近 1（容差 3%），且所有端点/控制点到中心距离 ≈ r（贝塞尔近似圆的控制点距 ≈ r×1.09，端点 = r）
  if (Math.abs(rx - ry) / rx > 0.03) return null;
  const r = (rx + ry) / 2;
  // 距离检验：端点（每段末 2 个值）距离应 ≈ r；控制点 ≈ r×1.09±0.06r
  let endOk = 0, ctlOk = 0;
  for (const c of segs) {
    const de = Math.hypot(c[4] - cx, c[5] - cy);
    if (Math.abs(de - r) < r * 0.02) endOk++;
    const d1 = Math.hypot(c[0] - cx, c[1] - cy);
    const d2 = Math.hypot(c[2] - cx, c[3] - cy);
    if (Math.abs(d1 - r * 1.09) < r * 0.06) ctlOk++;
    if (Math.abs(d2 - r * 1.09) < r * 0.06) ctlOk++;
  }
  if (endOk !== segs.length || ctlOk !== segs.length * 2) return null;
  return { cx, cy, r };
}

// 解析 body 里的绘制元素 → [{color, type:'path', d} | {type:'circle', cx,cy,r} ...]
// 注意：IconPark 的 Iconify 展开把公共属性放在 <g> 上（如 <g fill="none" stroke="#000">），
// 子元素只带覆盖属性——必须继承 g 的 fill/stroke/stroke-width。
function parseBody(body) {
  const shapes = [];
  // 维护 g 栈（简化：顺序扫 g 开/闭，记录当前继承环境 + transform scale）
  // transform 仅支持 scale(n)（lucide 24 空间图标包 scale(2) 用）；坐标变换在 sample/投影前应用
  const gStack = [{ fill: null, stroke: null, sw: 4, sc: 1, tx: 0, ty: 0 }];
  // token 流：逐段找 <g ...>、</g>、<path .../>、<circle .../>、<ellipse .../>、<rect .../>
  const re = /<(g)([^>]*)>|<\/g>|<(path|circle|ellipse|rect)([^>]*)\/?>(?:<\/\3>)?/g;
  let m;
  while ((m = re.exec(body))) {
    if (m[1] === 'g') {
      const attrs = m[2];
      const parent = gStack[gStack.length - 1];
      const fill = (attrs.match(/ fill="([^"]+)"/) || [])[1] || parent.fill;
      const stroke = (attrs.match(/ stroke="([^"]+)"/) || [])[1] || parent.stroke;
      const sw = parseFloat((attrs.match(/ stroke-width="([^"]+)"/) || [])[1] || parent.sw);
      const scA = (attrs.match(/transform="[^"]*scale\(([\d.]+)\)[^"]*"/) || [])[1];
      const sc = scA ? parent.sc * parseFloat(scA) : parent.sc;
      // translate(tx[ ty])：复合 transform 中作用于 scale 之后的 48 空间平移（x=sc*tx, y=sc*ty）
      const trA = (attrs.match(/transform="[^"]*translate\(([-\d.]+)(?:\s+([-\d.]+))?\)/) || []);
      const tx = trA[1] ? parent.tx + parseFloat(trA[1]) * sc : parent.tx;
      const ty = trA[2] !== undefined ? parent.ty + parseFloat(trA[2]) * sc : (trA[1] ? parent.ty + parseFloat(trA[1]) * sc : parent.ty);
      gStack.push({ fill, stroke, sw, sc, tx, ty });
    } else if (m[0] === '</g>') {
      if (gStack.length > 1) gStack.pop();
    } else {
      const tag = m[3], attrs = m[4];
      const env = gStack[gStack.length - 1];
      // 元素自身属性优先，缺省继承 g；fill="none" 显式表示不填充
      const fillA = (attrs.match(/ fill="([^"]+)"/) || [])[1];
      const strokeA = (attrs.match(/ stroke="([^"]+)"/) || [])[1];
      const swA = (attrs.match(/ stroke-width="([^"]+)"/) || [])[1];
      const fill = fillA !== undefined ? fillA : env.fill;   // 可能是 'none'
      let stroke = strokeA !== undefined ? strokeA : env.stroke;
      const sw = swA !== undefined ? parseFloat(swA) : env.sw;
      // SVG 默认 fill=黑：fill 与 stroke 均未指定（null/undefined，且非显式 'none'）→ 黑填充
      const noFill = fill === undefined || fill === null;
      const noStroke = stroke === undefined || stroke === null;
      const effFill = noFill && noStroke ? '#000' : fill;
      const sc = env.sc || 1; // g 的 scale(n) 变换（lucide 24 空间包 scale(2)）
      if (tag === 'path') {
        const d = (attrs.match(/ d="([^"]+)"/) || [])[1];
        if (d) {
          const circ = detectCirclePath(d);
          if (circ) shapes.push({ type: 'circle', cx: circ.cx * sc, cy: circ.cy * sc, r: circ.r * sc, fill: effFill, stroke, sw: sw * sc });
          else shapes.push({ type: 'path', d, fill: effFill, stroke, sw: sw * sc, sc, tx: env.tx || 0, ty: env.ty || 0 });
        }
      } else if (tag === 'circle') {
        const cx = parseFloat((attrs.match(/ cx="([^"]+)"/) || [])[1]);
        const cy = parseFloat((attrs.match(/ cy="([^"]+)"/) || [])[1]);
        const r = parseFloat((attrs.match(/ r="([^"]+)"/) || [])[1]);
        shapes.push({ type: 'circle', cx: cx * sc, cy: cy * sc, r: r * sc, fill, stroke, sw: sw * sc });
      } else if (tag === 'ellipse') {
        // 椭圆（如 rabbit 身体）：rx==ry 视作 circle，否则按「填充=path 近似」处理：
        // 用参数方程采样成闭合 polyline（fill 走 ray-cast，stroke 走投影）
        const cx = parseFloat((attrs.match(/ cx="([^"]+)"/) || [])[1]);
        const cy = parseFloat((attrs.match(/ cy="([^"]+)"/) || [])[1]);
        const rx = parseFloat((attrs.match(/ rx="([^"]+)"/) || [])[1]);
        const ry = parseFloat((attrs.match(/ ry="([^"]+)"/) || [])[1]);
        if (Math.abs(rx - ry) / Math.max(rx, ry) < 0.03) {
          shapes.push({ type: 'circle', cx: cx * sc, cy: cy * sc, r: (rx + ry) / 2 * sc, fill, stroke, sw: sw * sc });
        } else {
          const pts = [];
          const N = 128;
          for (let i = 0; i < N; i++) {
            const t = (i / N) * Math.PI * 2;
            pts.push([(cx + rx * Math.cos(t)) * sc, (cy + ry * Math.sin(t)) * sc]);
          }
          pts.push([pts[0][0], pts[0][1]]);
          shapes.push({ type: 'ellipse', pts, fill, stroke, sw: sw * sc });
        }
      } else if (tag === 'rect') {
        const x = parseFloat((attrs.match(/ x="([^"]+)"/) || [])[1] || '0');
        const y = parseFloat((attrs.match(/ y="([^"]+)"/) || [])[1] || '0');
        const w = parseFloat((attrs.match(/ width="([^"]+)"/) || [])[1]);
        const h = parseFloat((attrs.match(/ height="([^"]+)"/) || [])[1]);
        shapes.push({ type: 'rect', x, y, w, h, fill, stroke, sw });
      }
    }
  }
  return shapes;
}

// 判断点是否在 path 内（ray casting over polyline）
function pointInPolyline(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 把重着色后的 body 光栅化到 16×16：返回 16×16 的二维数组（存色值 hex 或 null）
// 策略：
//  1. 归一化 48→16（除以 3）
//  2. fill path：ray casting → 命中格 = fill 色
//  3. stroke path：采样点投影，1.33px 线宽 → 占 1 格（最近格染色）；stroke 色优先级低于 fill（后画覆盖先画）
function rasterizePark(body, size = 16) {
  const src = 48;
  const scale = src / size; // 3
  // 完美像素：所有坐标先对齐 3px 源网格（= 16 空间整数格），消除半格歪斜/毛边
  const snap = (v) => Math.round(v / scale) * scale;
  const snapPts = (pts) => {
    const out = [];
    let px = NaN, py = NaN;
    for (const [x, y] of pts) {
      const sx = snap(x), sy = snap(y);
      if (sx !== px || sy !== py) { out.push([sx, sy]); px = sx; py = sy; }
    }
    return out;
  };
  // 逐元素解析并采样
  const layers = []; // {color, pts?, circle?, isFill}
  const shapes = parseBody(body);
  // 简化：继承 group 上的 stroke（IconPark 在 <g stroke="#000" ...> 上带公共描边）
  // parseBody 里 path 自身一般也带 stroke（Iconify 已展开），若有缺省则父 g 是黑描边
  for (const s of shapes) {
    if (s.type === 'path') {
      let pts = samplePath(s.d);
      if (s.sc && s.sc !== 1) pts = pts.map(([x, y]) => [x * s.sc, y * s.sc]); // g scale(n) 变换
      if (s.tx || s.ty) pts = pts.map(([x, y]) => [x + (s.tx || 0), y + (s.ty || 0)]); // g translate 平移
      const sp = snapPts(pts);
      const fillColor = s.fill && s.fill !== 'none' ? s.fill : null;
      const strokeColor = s.stroke && s.stroke !== 'none' ? s.stroke : (s.fill ? null : '#000');
      layers.push({ pts: sp, fillColor, strokeColor, sw: s.sw });
    } else if (s.type === 'ellipse') {
      layers.push({ pts: s.pts, fillColor: s.fill && s.fill !== 'none' ? s.fill : null, strokeColor: s.stroke && s.stroke !== 'none' ? s.stroke : null, sw: s.sw });
    } else if (s.type === 'circle') {
      // 圆形对齐：圆心落到格点、半径落到整格（≥1）
      s.cx = snap(s.cx); s.cy = snap(s.cy);
      s.r = Math.max(scale, Math.round(s.r / scale) * scale);
      layers.push({ circle: s, fillColor: s.fill && s.fill !== 'none' ? s.fill : null, strokeColor: s.stroke && s.stroke !== 'none' ? s.stroke : (s.fill ? null : '#000'), sw: 4 });
    }
  }
  // 光栅化：先 fill 后 stroke（与 SVG 绘制顺序一致，逐层覆盖）
  const grid = Array.from({ length: size }, () => new Array(size).fill(null));
  const drawStrokeFor = (L, hitTest) => {
    const sc = L.strokeColor;
    if (!sc) return;
    const half = (L.sw || 4) / 2;
    for (let gy = 0; gy < size; gy++) for (let gx = 0; gx < size; gx++) {
      const px = (gx + 0.5) * scale, py = (gy + 0.5) * scale;
      if (hitTest(px, py, half)) grid[gy][gx] = sc;
    }
  };
  // pass0: rect fills+strokes（解析几何，最可靠）——对齐 3px 网格保证完美像素
  for (const s of shapes) {
    if (s.type !== 'rect') continue;
    const x0 = snap(s.x), y0 = snap(s.y);
    const x1 = snap(s.x + s.w), y1 = snap(s.y + s.h);
    if (s.fill && s.fill !== 'none') {
      for (let gy = 0; gy < size; gy++) for (let gx = 0; gx < size; gx++) {
        const px = (gx + 0.5) * scale, py = (gy + 0.5) * scale;
        if (px > x0 && px < x1 && py > y0 && py < y1) grid[gy][gx] = s.fill;
      }
    }
    if (s.stroke && s.stroke !== 'none') {
      const half = (s.sw || 4) / 2;
      for (let gy = 0; gy < size; gy++) for (let gx = 0; gx < size; gx++) {
        const px = (gx + 0.5) * scale, py = (gy + 0.5) * scale;
        const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
        if (Math.hypot(dx, dy) <= half + scale * 0.2) grid[gy][gx] = s.stroke;
      }
    }
  }
  // pass1: path/circle fills
  for (const L of layers) {
    if (L.circle) {
      const { cx, cy, r } = L.circle;
      // 解析完美圆：环带 [Rin, Rout) 整格均匀（16 空间），格心距离判定
      const half = (L.sw || 4) / 2;
      const Rout = Math.round((r + half) / scale);
      const Rin = Math.round((r - half) / scale);
      for (let gy = 0; gy < size; gy++) for (let gx = 0; gx < size; gx++) {
        const dx = gx + 0.5 - cx / scale, dy = gy + 0.5 - cy / scale;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (L.strokeColor && dist >= Rin && dist < Rout) grid[gy][gx] = L.strokeColor;
        else if (L.fillColor && dist < Rout - 1) grid[gy][gx] = L.fillColor;
      }
      continue;
    }
    if (!L.fillColor || !L.pts) continue;
    const pts = L.pts || samplePathOf(L);
    for (let gy = 0; gy < size; gy++) for (let gx = 0; gx < size; gx++) {
      const px = (gx + 0.5) * scale, py = (gy + 0.5) * scale;
      if (pointInPolyline(px, py, pts)) grid[gy][gx] = L.fillColor;
    }
  }
  // pass2: strokes
  for (const L of layers) {
    const sc = L.strokeColor;
    if (!sc) continue;
    if (L.circle) {
      // 已在 pass1 解析环带处理（fill+stroke 一次完成），跳过
      continue;
    }
    const pts = L.pts || samplePathOf(L);
    const half = (L.sw || 4) / 2;
    // 细描边：half/scale < 1（源 4px 描边 @48）→ 每采样点只染「格心最近的那一格」（1 格粗线）；
    // ≥1（源 6px+ 粗描边）→ 按半径染格
    const rad = half / scale;
    for (const [x, y] of pts) {
      const cx = x / scale, cy = y / scale;
      if (rad < 1) {
        // 细线模式：只染最近格
        const gx = Math.min(size - 1, Math.max(0, Math.floor(cx)));
        const gy = Math.min(size - 1, Math.max(0, Math.floor(cy)));
        grid[gy][gx] = sc;
        continue;
      }
      const gx0 = Math.floor(cx - rad), gx1 = Math.ceil(cx + rad);
      const gy0 = Math.floor(cy - rad), gy1 = Math.ceil(cy + rad);
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
        if (gx < 0 || gx >= size || gy < 0 || gy >= size) continue;
        const px = gx + 0.5, py = gy + 0.5;
        if ((px - cx) ** 2 + (py - cy) ** 2 <= rad * rad) grid[gy][gx] = sc;
      }
    }
  }
  return grid;
  function samplePathOf(L) { return L.__pts || (L.__pts = samplePath(L.d)); }
}

// 16×16 色值网格 → 站内色板键 ASCII（PALETTE 就近匹配）
const PALETTE = require('../../scripts/xp-icons.js').PALETTE;
function nearestKey(hex) {
  if (!hex) return '.';
  let h = hex.replace('#', '');
  // 3 位缩写展开（#000 → 000000, #fff → ffffff）
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  let best = '.', bd = Infinity;
  for (const [key, kh] of Object.entries(PALETTE)) {
    const p = kh.replace('#', '');
    const pr = parseInt(p.slice(0, 2), 16), pg = parseInt(p.slice(2, 4), 16), pb = parseInt(p.slice(4, 6), 16);
    // 加权欧氏距离（人眼对绿敏感）
    const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
    if (d < bd) { bd = d; best = key; }
  }
  return best;
}

function gridToAscii16(grid) {
  return grid.map(row => row.map(c => nearestKey(c)).join('')).join('\n');
}

module.exports = { samplePath, parseBody, rasterizePark, nearestKey, gridToAscii16, park };
