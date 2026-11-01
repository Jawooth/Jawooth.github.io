/* 生成器：把 scripts/_xp-icon-css.js 拼好的 CSS 输出成 /css/xp-icons.css。
   和 scripts/_xp-route-js.js 一个思路——用 hexo 的虚拟路由，而不是往 source/ 里
   写构建产物（那样 hexo clean 之后还得记得重新生成，也容易被 git 收进去）。 */
const { XPIconCss } = require('./_xp-icon-css');

hexo.extend.generator.register('xp_icon_css', () => [
  { path: 'css/xp-icons.css', data: XPIconCss },
]);
