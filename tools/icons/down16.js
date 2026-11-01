// 24×24 → 16×16 直接盒滤波降采样测试（对比 24→12 路线）
// 每个目标像素覆盖源上 [x*24/16, (x+1)*24/16) 区域，按覆盖率>0.5 取样
function down16(g24) {
  const out = Array.from({ length: 16 }, () => new Array(16).fill(0));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const x0 = x * 24 / 16, x1 = (x + 1) * 24 / 16;
      const y0 = y * 24 / 16, y1 = (y + 1) * 24 / 16;
      let hit = 0, tot = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const ox = Math.min(x1, sx + 1) - Math.max(x0, sx);
          const oy = Math.min(y1, sy + 1) - Math.max(y0, sy);
          tot += ox * oy;
          if (g24[sy] && g24[sy][sx]) hit += ox * oy;
        }
      }
      out[y][x] = hit / tot > 0.5 ? 1 : 0;
    }
  }
  return out;
}
module.exports = { down16 };
