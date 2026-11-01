// fluent-color 39 色是真多色。抽几个站内需要的图标看 body 结构和图标名覆盖
const f = require('@iconify-json/fluent-color/icons.json');
const keys = Object.keys(f.icons);
console.log('total: ' + keys.length);
// 找站内语义
const kws = ['clipboard','tag','palette','chart','compass','search','pencil','clock','gamepad','wrench','home','folder','sun','moon','power','volume','lock','calendar','copy','heart','pin','eye','play','pause','book','mail','tv','globe','rss','github','weibo','zhihu','twitter','facebook','calculator','snake','puzzle','check','checkbox','list','dice','lightbulb','question','user','arrow','menu','close','link','expand','note','image','star'];
for (const kw of kws) {
  const hits = keys.filter(n => n.includes(kw)).slice(0, 5);
  console.log(kw + ': ' + (hits.length ? hits.join(', ') : '---'));
}
