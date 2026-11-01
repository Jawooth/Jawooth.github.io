// 分析 withicons（多主题合集）与 fluent-color 的色板
const w = require('@iconify-json/withicons/icons.json');
const f = require('@iconify-json/fluent-color/icons.json');
const colorsOf = (d) => {
  const s = new Set();
  for (const ic of Object.values(d.icons)) {
    for (const m of ic.body.matchAll(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) s.add(m[2]);
  }
  return s;
};
const ws = colorsOf(w), fs = colorsOf(f);
console.log('withicons icons: ' + Object.keys(w.icons).length + ', colors: ' + ws.size);
console.log('fluent-color icons: ' + Object.keys(f.icons).length + ', colors: ' + fs.size);
console.log('withicons colors: ' + [...ws].slice(0, 30).join(' '));
console.log('fluent colors: ' + [...fs].slice(0, 30).join(' '));
// withicons 主题后缀统计
const themes = {};
for (const n of Object.keys(w.icons)) {
  const m = n.match(/-(blueprint|duo|engrave|gloss|sketch|solid|pastel|plush|sticker|bauhaus|anime|gothic|skeuo|halloween|christmas)$/);
  if (m) themes[m[1]] = (themes[m[1]] || 0) + 1;
}
console.log('themes: ' + JSON.stringify(themes));
