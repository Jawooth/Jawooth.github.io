// Pixelarticons SVG path → 24×24 grid → 12×12 downsample → ASCII art
// 解码规则：全库 path 仅含 M/m/H/h/V/v/z，每个 z 结尾子路径 = 轴对齐矩形，nonzero 填充
const fs = require('fs');
const path = require('path');

// npm 把包装到了仓库根 D:\tools\hexo\node_modules（tools/icons 无 package.json 时向上查找），逐级向上找
function findSvgDir() {
  let dir = __dirname;
  for (let i = 0; i < 4; i++) {
    const cand = path.join(dir, 'node_modules', 'pixelarticons', 'svg');
    if (fs.existsSync(cand)) return cand;
    dir = path.dirname(dir);
  }
  throw new Error('pixelarticons/svg not found');
}
const SVG_DIR = findSvgDir();

function decodePath(d) {
  // tokenize
  const tokens = d.match(/[MmHhVvZz]|-?\d+(?:\.\d+)?/g) || [];
  let i = 0;
  const rects = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let cur = null; // {x0,y0,x1,y1}
  const next = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i++];
    if (t === 'M' || t === 'm') {
      let x = next(), y = next();
      if (t === 'm') { x += cx; y += cy; }
      cx = sx = x; cy = sy = y;
      cur = { x0: x, y0: y, xs: [x], ys: [y] };
    } else if (t === 'h' || t === 'H') {
      let v = next();
      if (t === 'h') v += cx;
      cx = v; cur.xs.push(v); cur.ys.push(cy);
    } else if (t === 'v' || t === 'V') {
      let v = next();
      if (t === 'v') v += cy;
      cy = v; cur.ys.push(v); cur.xs.push(cx);
    } else if (t === 'z' || t === 'Z') {
      cur.xs.push(sx); cur.ys.push(sy);
      const x0 = Math.min(...cur.xs), x1 = Math.max(...cur.xs);
      const y0 = Math.min(...cur.ys), y1 = Math.max(...cur.ys);
      // signed area for winding direction
      let area = 0;
      for (let k = 0; k < cur.xs.length - 1; k++) {
        area += cur.xs[k] * cur.ys[k + 1] - cur.xs[k + 1] * cur.ys[k];
      }
      rects.push({ x0, y0, x1, y1, dir: area >= 0 ? 1 : -1 });
      // SVG 规范：closepath 后当前点回到子路径起点（后续相对 m 以此为基准）
      cx = sx; cy = sy;
      cur = null;
    }
  }
  return rects;
}

function rasterize24(rects) {
  const g = Array.from({ length: 24 }, () => new Array(24).fill(0));
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const px = x + 0.5, py = y + 0.5;
      let w = 0;
      for (const r of rects) {
        if (px > r.x0 && px < r.x1 && py > r.y0 && py < r.y1) w += r.dir;
      }
      g[y][x] = w !== 0 ? 1 : 0;
    }
  }
  return g;
}

// 24→12 整数 2:1 降采样（2×2 块内任一像素点亮则点亮）
function down12(g24) {
  const g = Array.from({ length: 12 }, () => new Array(12).fill(0));
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    g[y][x] = (g24[y*2][x*2] || g24[y*2][x*2+1] || g24[y*2+1][x*2] || g24[y*2+1][x*2+1]) ? 1 : 0;
  }
  return g;
}

function decodeIcon(name) {
  const file = path.join(SVG_DIR, name + '.svg');
  if (!fs.existsSync(file)) return null;
  const svg = fs.readFileSync(file, 'utf8');
  const d = (svg.match(/ d="([^"]+)"/) || [])[1];
  if (!d) return null;
  return down12(rasterize24(decodePath(d)));
}

function gridToAscii(g) {
  return g.map(r => r.map(v => v ? '#' : '.').join('')).join('\n');
}

module.exports = { decodeIcon, decodePath, rasterize24, down12, gridToAscii, SVG_DIR };

// CLI: node decode-pixelarticons.js icon1 icon2 ...
if (require.main === module) {
  const names = process.argv.slice(2);
  for (const n of names) {
    const g = decodeIcon(n);
    console.log('=== ' + n + (g ? '' : ' (MISSING)') + ' ===');
    if (g) console.log(gridToAscii(g));
  }
}
