/* 社交原生图标：simple-icons 官方品牌真身，统一实心站内蓝 #4a86e8。
 * 决策沿革：m02896 采用 simple-icons 官方形 → m02994 曾线条化（stroke 轮廓
 * 效果差：实心字形被描一圈成空心方框）→ 本轮改回官方真身 + 单色实心填充。
 * email/web 等中性图标不在此表，仍走 IconPark（park-map.js）。 */
const si = require('simple-icons');

/* 2026-11-05 站主：社交图标要和播放器按钮「使用相同颜色」。
   播放器线条经 park-recolor.js 的 TINT 取 n = #0054e3（站内 XP 标题栏深蓝），
   所以这里同步改成同一个值 —— 以前是 #4a86e8（浅蓝 b），两组看着像两种蓝。
   注意 siBody 直接写死 fill，不走 TINT，改色只能改这一个常量。 */
const BLUE = '#0054e3';

const SOCIAL = {
  'icon-social-github':     { slug: 'siGithub' },
  'icon-social-bilibili':   { slug: 'siBilibili' },
  'icon-social-redbook':    { slug: 'siXiaohongshu' },
  'icon-social-pixiv':      { slug: 'siPixiv' },
  'icon-social-bluesky':    { slug: 'siBluesky' },
  'icon-social-weibo':      { slug: 'siSinaweibo' },
  'icon-social-x':          { slug: 'siX' },
  'icon-social-twitter':    { slug: 'siX' }, // X 顶替 twitter（用户决定）
  'icon-social-facebook':   { slug: 'siFacebook' },
  'icon-social-zhihu':      { slug: 'siZhihu' },
  'icon-social-rss':        { slug: 'siRss' },
};

/* simple-icons path 是 24 空间 → scale(2) 到 48 空间统一。
 * 实心官方真身：fill=站内蓝，保持品牌形状识别度，观感与站内蓝主题一致。 */
function siBody(id) {
  const conf = SOCIAL[id];
  const ic = si[conf.slug];
  if (!ic) throw new Error('simple-icons missing: ' + conf.slug);
  return `<g transform="scale(2)"><path fill="${BLUE}" d="${ic.path}"/></g>`;
}

module.exports = { SOCIAL, siBody };
