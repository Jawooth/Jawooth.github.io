// 统计 icon-park 的颜色体系
const d = require('@iconify-json/icon-park/icons.json');
const colors = {};
for (const ic of Object.values(d.icons)) {
  for (const m of ic.body.matchAll(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) {
    colors[m[2]] = (colors[m[2]] || 0) + 1;
  }
}
const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);
console.log('distinct colors: ' + sorted.length);
console.log(sorted.slice(0, 15).map(([c, n]) => c + ': ' + n).join('\n'));
// 黑色描边占比 & 官方「两种主题」确认
let blackStroke = 0, total = 0;
for (const ic of Object.values(d.icons)) {
  total++;
  if (ic.body.includes('stroke="#000"')) blackStroke++;
}
console.log(`icons with #000 stroke: ${blackStroke}/${total}`);
