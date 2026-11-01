/* 共享工具：把一段「常量」浏览器脚本外链成 /js/xp-*.js 文件。
   为什么单独一个文件：Hexo 把 scripts/ 下每个 .js 各自包进带 hexo 的 IIFE，
   互相 require 会拿到没有 hexo 的普通模块作用域（xp-content.js require
   xp-enhance.js 时就炸过 ReferenceError: hexo is not defined）。
   所以把不依赖加载期 hexo 全局的纯逻辑放这里，由各脚本传入自己的 hexo。
   用 generator 虚拟路由而不是直接写 public/：hexo clean 后也会重新产出，
   不产生需要 gitignore 的构建垃圾。 */
const crypto = require('crypto');

const jsVersionCache = new Map();   // { [路由路径]: md5 前 8 位 }

/* routeJs(hexo, '/js/xp-xxx.js', () => 脚本字符串)：注册 generator 输出该文件 */
function routeJs(hexo, routePath, build) {
  hexo.extend.generator.register('xpjs_' + routePath, () => {
    const content = build();
    jsVersionCache.set(routePath, crypto.createHash('md5').update(content).digest('hex').slice(0, 8));
    /* ⚠ Hexo 8 的 generator 必须返回 [{path, data}] 数组（core 里 reduce+concat
       后逐项检查 .path；返回 {path: data} 映射会被当作没有 path 而静默丢弃）。 */
    return [{ path: routePath.replace(/^\//, ''), data: content }];
  });
}

/* withJsVer(str, routePath)：给 HTML 里的 `<script src="routePath">` 补 ?v= 版本号 */
function withJsVer(str, routePath) {
  const ver = jsVersionCache.get(routePath);
  if (!ver) return str;
  return str.replace(`${routePath}"`, `${routePath}?v=${ver}"`);
}

module.exports = { routeJs, withJsVer, jsVersionCache };
