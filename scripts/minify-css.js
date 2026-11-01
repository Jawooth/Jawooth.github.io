/* global hexo */
/**
 * 构建期 CSS 压缩（2026-10-19 新增，零依赖）
 *
 * 背景：source/css/xp-custom.css 约 244KB（gzip 后 ~78KB），vendor 的 XP.css 219KB，
 * 两个都未压缩直接发布。源文件里的注释是有价值的决策记录，**不能动源文件**；
 * 这里在 generate 写完 public/ 之后对这两个产物文件原地压缩（去注释 + 折叠空白），
 * 源文件保持可读，public/ 里的产物变小。
 *
 * 为什么用 generateAfter 后处理而不是 after_render:css 过滤器：
 * source/ 下未被渲染的静态资源（css 就是）走的是「原样拷贝」通道，
 * after_render:* 过滤器不会触发，只有 generate 落盘后处理是确定的。
 *
 * ⚠ 2026-10-22 修的真 bug：generateAfter 发出时，**文件其实还没写到 public/**。
 *   看 node_modules/hexo/dist/hexo/index.js:415-433 的 _generate()：它只把路由
 *   set 进 route 表，真正落盘是 console/generate.js 的 firstGenerate()，而那一步
 *   在 load()（内部会 _generate）**之后**才跑。于是：
 *     · 增量构建（public/ 里已有上次的产物）→ 压缩正常，一直是这个情况，所以没露馅；
 *     · **hexo clean && hexo generate** → public/ 是空的，读文件 ENOENT，
 *       两个文件都被「跳过」，发布出去的是 258KB 未压缩 CSS。
 *   修法：同一个函数挂在三个时机上，各自先 existsSync 再动手。
 *   minifyCss 是幂等的（注释已剥、空白已折叠，跑两遍结果一样），所以重复调用无害。
 *     · generateAfter —— 增量构建 / hexo server 的 watch 重生成
 *     · deployBefore  —— hexo deploy 时文件已落盘、部署器还没复制（关键时机）
 *     · exit          —— 单独跑 hexo generate，落盘发生在 generateAfter 之后
 *
 * ⚠ 压缩规则刻意保守（个人博客，正确性 > 极限压缩率）：
 *   · 只剥 /* *\/ 注释（字符串里若出现 "/*" 会被误伤——本站两个 CSS 里没有这种写法，
 *     改 CSS 时留意别把 url("data:...") 里塞注释）；
 *   · 只折叠 { } ; : , 周围与行间的空白，不重写属性值（不做颜色缩写/去引号等
 *     可能改变语义的优化，那些交给真正的 minifier）；
 *   · 不动 url(...) 内部（字体路径/参数不含空白，折叠也无益）。
 * hexo server（watch 模式）不触发 generateAfter，本地预览看到的是未压缩版，无影响。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TARGETS = [
  'css/xp-custom.css',
  'vendor/xp-css/XP.css'
];

function minifyCss(css) {
  return css
    /* 先剥注释（non-greedy，逐段剥）。字符串内的 "/*" 不存在于本站 CSS 中 */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    /* 折叠空白：先去换行与缩进，再去操作符周围的空格 */
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    /* 空规则块与残留的首尾空白 */
    .replace(/;\}/g, '}')
    .trim();
}

function run(trigger) {
  TARGETS.forEach((rel) => {
    const file = path.join(hexo.base_dir, 'public', rel);
    /* 三个时机里至少有一个碰上「还没落盘」，用同步 stat 判断，别指望 catch 打日志 */
    if (!fs.existsSync(file)) return;
    try {
      const src = fs.readFileSync(file, 'utf8');
      const out = minifyCss(src);
      if (out.length === src.length) return;   /* 已经是压缩过的，别重复报体积 */
      fs.writeFileSync(file, out);
      hexo.log.info('[minify-css:%s] %s: %dKB → %dKB',
        trigger, rel, Math.round(src.length / 1024), Math.round(out.length / 1024));
    } catch (err) {
      /* 产物读不了就把构建弄挂不值得，留一条警告 */
      hexo.log.warn('[minify-css:%s] 跳过 %s：%s', trigger, rel, err.message);
    }
  });
}

hexo.on('generateAfter', () => run('generate'));
hexo.on('deployBefore', () => run('deploy'));
/* 单独跑 hexo generate 时，落盘发生在 generateAfter 之后、进程退出之前。
   exit 是唯一能保证「文件已经写完了」的同步时机（见文件头那段说明）。 */
hexo.on('exit', () => run('exit'));
