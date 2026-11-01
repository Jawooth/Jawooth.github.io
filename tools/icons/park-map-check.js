// 校验映射表里的 IconPark 名是否都存在
const park = require('@iconify-json/icon-park/icons.json');
const map = require('./park-map.js');
const missing = [];
for (const [site, [parkName, why]] of Object.entries(map)) {
  if (!park.icons[parkName]) missing.push(`${site} -> ${parkName} (${why})`);
}
console.log('mapped: ' + Object.keys(map).length + '/73');
console.log(missing.length ? 'MISSING:\n' + missing.join('\n') : 'all park names exist');
