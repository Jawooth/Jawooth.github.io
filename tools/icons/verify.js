/* verify.js —— smooth 矢量版校验（m01919 平滑多色方案 + m02994 蓝线条）
 * GLYPHS 值现在是 48 空间 SVG body（非 16×16 点阵）：
 *  1. 每个 id 的 body 非空、含合法 SVG 标签；
 *  2. 无 #000 纯黑（线条统一灰蓝 G #6b7480 或站点蓝）；
 *  3. media/social 组：fill 全为 none（无填充，纯线条）；
 *  4. pixelSymbol(id, GLYPHS[id]) 能产出 <symbol>（壳层兼容）；
 *  5. ICON_FONT_MAP 引用的 glyph 全部存在。
 */
const { GLYPHS, PALETTE, pixelSymbol } = require('../../scripts/xp-icons.js');
const { ICON_FONT_MAP } = require('../../scripts/_xp-icon-css.js');

const ids = Object.keys(GLYPHS);
console.log('count:', ids.length);

const need = ['icon-clipboard', 'icon-post', 'icon-tag', 'icon-chart', 'icon-compass', 'icon-search', 'icon-clock', 'icon-image', 'nav-home', 'nav-guides', 'nav-archives', 'nav-thanks', 'nav-folder', 'tray-start', 'tray-vol-on', 'tray-vol-off', 'tray-sun', 'tray-moon', 'tray-power', 'icon-media-note', 'icon-media-play', 'icon-media-pause', 'icon-lock', 'icon-calendar', 'icon-copy', 'icon-warn', 'icon-critical', 'icon-menu', 'icon-close', 'icon-like-off', 'icon-like-on', 'icon-pin', 'icon-fallback', 'icon-calc', 'icon-notepad', 'icon-game-guide', 'icon-art-guide', 'icon-tech-guide', 'icon-bulb', 'icon-brick', 'icon-snake', 'icon-puzzle', 'icon-book', 'icon-social-redbook', 'icon-social-github', 'icon-social-email', 'icon-social-bilibili', 'icon-social-pixiv', 'icon-social-web', 'icon-social-bluesky', 'icon-social-twitter', 'icon-social-x', 'icon-social-weibo', 'icon-social-zhihu', 'icon-social-facebook', 'icon-social-rss', 'icon-todo-done', 'icon-todo-doing', 'icon-todo-pending', 'icon-media-dice', 'icon-media-list', 'icon-media-link', 'icon-media-expand', 'icon-media-collapse', 'icon-media-eye', 'icon-media-prev', 'icon-media-next', 'icon-pencil', 'icon-wrench', 'icon-palette', 'icon-user'];
const miss = need.filter((id) => !GLYPHS[id]);
console.log('missing:', miss.length ? miss.join(',') : '(none)');

let bad = 0;
for (const id of ids) {
  const body = GLYPHS[id];
  if (!body || !/<(path|rect|circle|ellipse|g)\b/.test(body)) { console.log('BAD body:', id); bad++; continue; }
  if (/#000\b|#000000/i.test(body)) { console.log('BAD pure black:', id); bad++; continue; }
  if (/^(icon-social-|icon-media-)/.test(id) && /fill="(?!none)[^"]*"/.test(body)) {
    console.log('BAD filled (line-only group):', id); bad++; continue;
  }
  try {
    const sym = pixelSymbol(id, body);
    if (!sym.startsWith('<symbol')) { console.log('BAD symbol:', id); bad++; }
  } catch (e) { console.log('THROW symbol:', id, e.message); bad++; }
}
console.log('bad:', bad);

const missingForCss = Object.values(ICON_FONT_MAP).filter((g) => !GLYPHS[g]);
console.log('iconfont refs missing:', missingForCss.length ? missingForCss.join(',') : '(none)');

console.log(bad === 0 && miss.length === 0 && missingForCss.length === 0 ? 'ALL OK' : 'FAILED');
process.exit(bad === 0 && miss.length === 0 && missingForCss.length === 0 ? 0 : 1);
