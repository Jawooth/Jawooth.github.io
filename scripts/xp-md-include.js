/* global hexo */

/**
 * 修复：markdown 页面里的 `<%- include('xp-window-title', ...) %>` 渲染不出来
 * ---------------------------------------------------------------
 * 现象：source/index.md 这类页面里写 include，产物里原样输出这串文本，
 *   窗口标题栏整个丢失。
 *
 * 根因（node_modules/hexo/dist/hexo/post.js 的 render()，hexo 8.1.2）：
 *   1. escapeAllSwigTags 只认 `{{`、`{#`、`{%` 三种开头，对 `<%-` 视而不见；
 *   2. markdown 渲染器把正文里的 `<` 转成 `&lt;`；
 *   3. onRenderEnd 里 tag.render（nunjucks）执行时 `<%-` 已经是死文本。
 *   试过的占位符方案（U+0001 护送）救不回来：tag.render 在 onRenderEnd 里
 *   就执行了，比 after_post_render 更早，占位符到不了 nunjucks 手里；
 *   就算到得了，nunjucks 也不认 `<%-`。
 *   ⇒ 结论：md 正文里的 EJS include 在 Hexo 架构下没有执行点，
 *     正确修法是在 after_post_render 里直接替换成渲染结果。
 *
 * 做法：正则匹配整条 `<%- include('./includes/xp-window-title', {...}) %>`，
 *   按参数生成同构 HTML。参数表必须与 xp-window-title.ejs 保持一致：
 *     title / titleHtml / icon / iconSize(默认14) / cls / compact / buttons
 *   - title 走与 ejs 相同的 HTML 转义（& < > "）；
 *   - titleHtml 调用方自己保证安全，不转义；
 *   - icon 画成 `class="inline-icon"` 的 `<use href="#icon-xxx"/>`，
 *     sprite 由 scripts/xp-enhance.js 提供；
 *   - ⚠ include 标签必须独占一行（写在 md 行首），否则 markdown 会把它
 *     当成代码块；换行/缩进导致的渲染差异也源于此。
 *   - 其它 include 写法一律 hexo.log.error 显式报错，不静默吞。
 */
'use strict';

const INCLUDE_RE = /<%-[ \t]*include\([ \t]*['"]\.\/includes\/xp-window-title['"][ \t]*,[ \t]*\{([\s\S]*?)\}[ \t]*\)[ \t]*%>/g;

/** 解析 EJS 风格字面量参数：title='用户账户', iconSize=12, compact=true */
function parseArgs(raw) {
  const opts = {};
  const re = /(\w+)\s*=\s*('([^']*)'|true|false|\d+)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const k = m[1];
    if (m[2] === 'true') opts[k] = true;
    else if (m[2] === 'false') opts[k] = false;
    else if (/^\d+$/.test(m[2])) opts[k] = Number(m[2]);
    else opts[k] = m[3];
  }
  return opts;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 与 xp-window-title.ejs 同构的 HTML（改 ejs 时必须同步这里） */
function renderTitle(opts) {
  const rawTitle = opts.titleHtml !== undefined ? String(opts.titleHtml)
    : opts.title !== undefined ? escapeHtml(String(opts.title)) : '';
  const icon = typeof opts.icon === 'string' && opts.icon ? opts.icon : '';
  const size = typeof opts.iconSize === 'number' && opts.iconSize > 0 ? opts.iconSize : 14;
  const cls = typeof opts.cls === 'string' && opts.cls ? ' ' + opts.cls : '';
  const compact = opts.compact ? ' compact' : '';
  const buttons = opts.buttons === undefined || opts.buttons;

  const iconHtml = icon
    ? `<svg class="inline-icon" width="${size}" height="${size}" aria-hidden="true"><use href="#icon-${icon}"/></svg>`
    : '';
  /* ⚠ 不要写 viewBox="0 0 16 16"：icon 集合里 icon-user 是 48×48（像素兔子），
     外层 svg 写死 16 viewBox 会把 48 网格裁到左上 1/3 且渲染发暗（2026-10-18
     无痕窗口实测「用户账户」标题栏兔子暗红）。svg 不带 viewBox 时浏览器用
     symbol 自己的 viewBox，任何 icon 都不会错。改这里必须同步 xp-window-title.ejs。 */
  /* ⚠ data-action 必须带：xp-custom.css 的三键图标是挂
     [data-action="min/max/close"] 选择器的背景图，缺了就只剩纯色块
     （2026-10-18 用户报「右上角三键无内容」即此原因）。
     事件绑定不依赖它（xp-content.js 认 .xp-window-btn 的 min/max/close 类）， */
  const btns = buttons ? '<i class="xp-window-btn min" data-action="min"></i><i class="xp-window-btn max" data-action="max"></i><i class="xp-window-btn close" data-action="close"></i>' : '';
  return `<div class="xp-window-title${compact}"><span class="xp-window-title-text post-title-text${cls}">${iconHtml}${rawTitle}</span>${btns ? '<span class="xp-window-btns">' + btns + '</span>' : ''}</div>`;
}

hexo.extend.filter.register('after_post_render', (data) => {
  if (typeof data.content !== 'string' || data.content.indexOf('<%-') === -1) return data;
  const rel = data.source || data.path || '(unknown)';

  data.content = data.content.replace(INCLUDE_RE, (full, rawArgs) => {
    if (rawArgs.indexOf('<%') !== -1) {
      hexo.log.error('[xp-md-include] %s 里 include 参数含动态表达式，请改成字面量：%s', rel, full);
      return full;
    }
    return renderTitle(parseArgs(rawArgs));
  });

  const rest = data.content.match(/<%-[\s\S]{0,80}/);
  if (rest) {
    hexo.log.error('[xp-md-include] %s 里存在未处理的 EJS 写法：%s…', rel, rest[0]);
  }
  return data;
});
