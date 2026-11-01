// 冒烟测试：decode-iconpark 光栅化几个代表性图标
const { rasterizePark, gridToAscii16, park } = require('./decode-iconpark.js');
const { recolor, TINT } = require('./park-recolor.js');
const MAP = require('./park-map.js');

const tests = ['icon-clipboard', 'icon-tag', 'nav-home', 'icon-media-play', 'icon-social-github', 'icon-brick'];
for (const site of tests) {
  const [parkName] = MAP[site];
  const raw = park.icons[parkName].body;
  const body = recolor(raw, TINT[site][0], TINT[site][1]);
  const grid = rasterizePark(body);
  console.log('=== ' + site + ' (park: ' + parkName + ') ===');
  console.log(gridToAscii16(grid));
  console.log();
}
