// 24→16 盒滤波测试：问题图标能否被救回
const { decodePath, rasterize24 } = require('./decode-pixelarticons');
const { down16 } = require('./down16');
const fs = require('fs');
const dir = 'D:/tools/hexo/node_modules/pixelarticons/svg';
const names = process.argv.slice(2).length ? process.argv.slice(2)
  : ['home', 'arrow-left', 'arrow-right', 'pencil', 'tools', 'play', 'power', 'volume', 'note', 'link'];
for (const n of names) {
  const svg = fs.readFileSync(`${dir}/${n}.svg`, 'utf8');
  const d = svg.match(/ d="([^"]+)"/)[1];
  const g16 = down16(rasterize24(decodePath(d)));
  console.log(`=== ${n} (16x16) ===`);
  console.log(g16.map((r) => r.map((v) => (v ? '#' : '.')).join('')).join('\n'));
}
