/**
 * 共享工具：把 scripts/xp-icons.js 的点阵图案输出成一份 CSS，
 * 用来接替主题 iconfont 字体图标的岗位（.icon-xxx:before 的那 15 个字形）。
 *
 * 为什么走 CSS 背景图而不是 <use>：
 *   1. 模板里全是 <i class="icon icon-calendar-outline"> 这种写法，改成内联 SVG
 *      要动十几个模板，还得处理主题 main.js 运行时把 icon-menu-outline 换成
 *      icon-close-outline 的类名切换；
 *   2. 代码块的「复制」按钮是主题 main.js 在浏览器里现场 createElement 出来的，
 *      服务端的 <use> 扫描器看不见它，塞不进 sprite；
 *   3. 点阵图标是**多色**的，本来就不能靠 currentColor 上色，背景图正好。
 *
 * 单独成文件、文件名以 _ 开头（hexo 仍会当脚本加载，但这里不碰 hexo 全局），
 * 是为了让 inject-xp-css.js 与 xp-icon-css.js 都能 require 到同一份 CSS 与版本号。
 */
const crypto = require('crypto');
const { GLYPHS, pixelGlyph } = require('./xp-icons');

/* 主题 iconfont 里的类名 → 点阵图案名。左边是 themes/minimalism/source/style/_blocks/fonts.styl
   里那 15 个 .icon-xxx:before，右边是 scripts/xp-icons.js 的 GLYPHS 键。 */
const ICON_FONT_MAP = {
  'icon-bluesky': 'icon-social-bluesky',
  'icon-rss': 'icon-social-rss',
  'icon-email': 'icon-social-email',
  'icon-copy': 'icon-copy',
  'icon-close-outline': 'icon-close',
  'icon-menu-outline': 'icon-menu',
  'icon-twitter': 'icon-social-twitter',
  'icon-facebook': 'icon-social-facebook',
  'icon-weibo': 'icon-social-weibo',
  'icon-zhihu': 'icon-social-zhihu',
  'icon-github': 'icon-social-github',
  'icon-calendar-outline': 'icon-calendar',
  'icon-pricetags-outline': 'icon-tag',
  'icon-arrow-ios-back-outline': 'icon-arrow-left',
  'icon-arrow-ios-forward-outline': 'icon-arrow-right',
};

/* 深色模式下的描边色。
   图标是 data-URI SVG 背景图，颜色写死在 SVG 里，CSS 的 color 改不动，
   所以深色变体必须在这里重新生成一份图，交给 html.dark 去切。
   ⚠ 2026-11-01 实测：原描边 #6b7480 在深色代码块底 #363648 上只有 2.49:1
   （浅色底 4.37~4.74:1 没问题），深色下描边几乎糊掉。
   换成 #c8c8d6（站内 --text-sub 的深色值）后 #363648 上 7.14:1。 */
const DARK_STROKE = '#c8c8d6';

/* 需要深色变体的图标：[主题类名, 图案名]。
   这几个都出现在「内容区」里 —— 底色跟着深色模式一起变深。 */
const DARK_VARIANTS = [
  ['icon-copy', 'icon-copy'],
  ['icon-calendar-outline', 'icon-calendar'],
  ['icon-pricetags-outline', 'icon-tag'],
  ['icon-arrow-ios-back-outline', 'icon-arrow-left'],
  ['icon-arrow-ios-forward-outline', 'icon-arrow-right'],
];

/* 生成深色变体：只换描边色，填充色保持原样
   （icon-copy 的 #dde3ec 是「纸片」浅色块，深底上 9.15:1，本来就清楚）。 */
function darkGlyph(glyphId) {
  const body = pixelGlyph(glyphId).replace(/#6b7480/gi, DARK_STROKE);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
    + `<g>${body}</g></svg>`;
}

/* 图案名必须都存在，拼错要在 hexo generate 时就炸，而不是线上少个图标 */
for (const [cls, glyph] of Object.entries(ICON_FONT_MAP)) {
  if (!GLYPHS[glyph]) throw new Error(`xp-icon-css: xp-icons.js 里没有图案 "${glyph}"（${cls} 要用）`);
}

/* 把 <rect> 串打包成一张独立 SVG，再 data-URI 成背景图。
   viewBox 固定 0 0 16 16，背景尺寸交给 CSS 的 background-size 控制，
   所以同一个图案在 12px（.post-info .icon）和 24px（.copy-code）下都清晰。 */
function dataUri(glyphId) {
  const body = pixelGlyph(glyphId);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
    + `<g>${body}</g></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function dataUriDark(glyphId) {
  const svg = darkGlyph(glyphId);
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function buildCss() {
  const lines = [];
  lines.push('/* 自动生成，别手改：scripts/_xp-icon-css.js 把 scripts/xp-icons.js 的点阵图案');
  lines.push('   转成背景图，接替主题 iconfont 的 .icon-xxx 字形。改图案去改 xp-icons.js。 */');
  lines.push('');
  lines.push('/* 先掐掉字体字形本身（.icon-xxx:before 的 content），再加背景图。');
  lines.push('   选择器带上 i/span 提高特异性，确保压过 fonts.styl 里的 .icon-xxx:before。 */');
  lines.push('i.icon::before, span.icon::before { content: none !important; }');
  lines.push('');
  lines.push('.icon {');
  lines.push('  display: inline-block;');
  lines.push('  width: 1em;');
  lines.push('  height: 1em;');
  lines.push('  background-repeat: no-repeat;');
  lines.push('  background-position: center;');
  lines.push('  background-size: 100% 100%;');
  lines.push('  vertical-align: -0.15em;');
  lines.push('  flex: 0 0 auto;');
  lines.push('}');
  lines.push('');
  /* 代码块右上角的复制按钮是 24px 字号，按 100% 铺满会顶到边，留点余量 */
  lines.push('.copy-code.icon { background-size: 80% 80%; }');
  lines.push('');
  for (const [cls, glyph] of Object.entries(ICON_FONT_MAP)) {
    lines.push(`.${cls} { background-image: url("${dataUri(glyph)}"); }`);
  }
  lines.push('');
  /* 深色变体：只在 html.dark 下换图（浅色底上的 #6b7480 本来就合格，别动）。
     只覆盖「底色会变深」的那几个图标 —— 内容区里的图标（代码块复制按钮、
     文章日期、标签、翻页箭头），它们的底在深色模式下是 --surface-2/#363648，
     原描边 #6b7480 只有 2.49:1。
     标题栏/任务栏/播放器里的图标底本来就是深蓝深绿，浅色模式下也一样，
     所以不在这个名单里。 */
  lines.push('/* 深色模式下的图标描边（见 DARK_STROKE 处的说明） */');
  for (const [cls, glyph] of DARK_VARIANTS) {
    lines.push('html.dark .' + cls + ' {');
    lines.push('  background-image: url("' + dataUriDark(glyph) + '");');
    lines.push('}');
  }
  lines.push('');
  return lines.join('\n');
}

const css = buildCss();
const ver = crypto.createHash('md5').update(css).digest('hex').slice(0, 8);

module.exports = { XPIconCss: css, XPIconCssVer: ver, ICON_FONT_MAP };
