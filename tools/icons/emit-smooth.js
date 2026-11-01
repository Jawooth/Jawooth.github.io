/* 落库管线：IconPark 平滑多色方案 → scripts/xp-icons.js
 *
 * 用户决策（m01919）：放弃像素化，应用平滑且多色的方案。
 * 即：IconPark 原始 SVG（48×48）+ park-recolor.js 的 18 键 TINT 重着色，
 * 保留原始贝塞尔曲线（平滑），社交/播放器组不做去填充（多色），线条为原生黑描边+彩色填充。
 *
 * 输出：tools/icons/smooth-glyphs.js —— { id: recoloredSvgBody }
 * 数据形态：与旧 GLYPHS 的 ASCII 点阵不同，值直接是 SVG body 字符串（48 空间）。
 * xp-icons.js 的 pixelSymbol/pixelGlyph 需配合改为：
 *   <symbol id viewBox="0 0 16 16"><g transform="scale(0.33333)">body</g></symbol>
 * 这样全站 14 处硬编码 viewBox="0 0 16 16" 的 svg 壳零改动。
 */
const fs = require('fs');
const path = require('path');
const park = require('@iconify-json/icon-park/icons.json');
const MAP = require('./park-map.js');
const { recolor, TINT, DARKBG_IDS, PALETTE_HEX } = require('./park-recolor.js');
const { PALETTE } = require('../../scripts/xp-icons.js');
const { SOCIAL, siBody } = require('./social-native.js');

const SKIP = new Set(); // icon-social-x 已恢复（m02896 用户采用 simple-icons 官方 X 形）

/* 播放器组去填充（用户 m02108：去除播放器内图标的填充颜色）→ 只留线条 */
function stripFill(body) {
  return body.replace(/<(path|rect|circle|ellipse|polygon)\b([^>]*?)(\/?)>/g, (m, tag, attrs, self) => {
    const stripped = attrs.replace(/\sfill="[^"]*"/g, '');
    return `<${tag}${stripped} fill="none"${self ? ' />' : '>'}`;
  });
}

/* 全封闭图标补填充（用户 m00386 需求1）：
 * IconPark 部分图标（pencil/tag/image/book-open/clipboard）主体是无 fill 的
 * 封闭轮廓 path，渲染出来是线框。这里给它们注入主色 fill。
 * 判定：path 带 d 且 d 以 Z/z 收尾（封闭）且自身无 fill 属性。 */
const FILL_CLOSED = new Set([
  'icon-pencil',      // 笔杆
  'icon-tag',         // 旗形签
  'icon-image',       // 照片外框
  'nav-guides',       // 摊开的书页×2
  'icon-clipboard',   // 板身（无 Z 的开放轮廓，特判注入）
]);
/* clipboard 板身识别串（d 固定不变，只匹配前缀） */
const CLIPBOARD_MAIN_D = 'M17 7H16H10C8.89543';

/* 白线图标上的橙色点缀（m01170：compass 顶针 / search 镜片） */
const ORANGE_ACCENT = '#f79240';

/* 白色线条图标（用户 m00604：icon-chart 要白色线条——它只出现在蓝色窗口
 * 标题栏「小站数据」上，白线与蓝底色差最大；浅底预览页会看不清属预期）。
 * 处理：recolor 后把所有 stroke 染成白，保留无 fill 线条形态。 */
const WHITE_LINE = new Set(['icon-chart', 'icon-compass', 'icon-search']);

/* 标题栏蓝底色差（m00386 需求2，v2 修正）：白描边方案在浅底预览下图标隐形，
 * 且 compass/notepad/bulb 主体白/浅色会糊成白块 —— 弃用。
 * 改为在 park-recolor.js 的 TINT 里把蓝/灰蓝系主色的标题图标换成暖色/异色，
 * 与蓝渐变标题栏（#0053ee~#0066ff）拉开色相；描边保持深灰蓝 G（在蓝底上是
 * 暗色轮廓，明度差足够）。 */

/* 自绘 Windows 徽标：四色方块（红绿蓝黄，2×2 留缝，48 空间） */
const START_LOGO = [
  '<g>',
  '<rect x="6" y="6" width="17" height="17" fill="#f25022"/>',
  '<rect x="25" y="6" width="17" height="17" fill="#7fba00"/>',
  '<rect x="6" y="25" width="17" height="17" fill="#00a4ef"/>',
  '<rect x="25" y="25" width="17" height="17" fill="#ffb900"/>',
  '</g>',
].join('');

/* 自绘彩色调色盘（用户 m02108/m02437：绘画图标更像调色盘）：
   椭圆盘 + 右上缺口 + 中央拇指孔 + 5 个彩色颜料点
   （m00604：盘身改白色填充，与彩色颜料点形成实心白盘观感） */
const PALETTE_DISH = [
  '<g fill="#ffffff" stroke="#6b7480" stroke-width="4" stroke-linejoin="round">',
  '<path d="M24 5C11.85 5 2 13.954 2 25C2 36.046 11.85 45 24 45C27.314 45 30 42.314 30 39C30 37.4 29.37 35.94 28.34 34.87C27.34 33.83 26.72 32.48 26.72 31C26.72 27.69 29.4 25 32.72 25H37C40.87 25 44 21.87 44 18C44 10.82 34.15 5 24 5Z"/>',
  '</g>',
  '<circle cx="13" cy="17" r="3.2" fill="#ef5b52"/>',
  '<circle cx="24" cy="13" r="3.2" fill="#ffd24a"/>',
  '<circle cx="35" cy="17" r="3.2" fill="#55b463"/>',
  '<circle cx="11" cy="28" r="3.2" fill="#4a86e8"/>',
  '<circle cx="19" cy="34" r="3.2" fill="#f79240"/>',
].join('');
/* 无色 body（如 github，靠 SVG 默认黑填充）→ 包 <g fill=主色>，避免渲染成黑块 */
function tintBodyless(body, mainKey) {
  if (/fill=|stroke=/.test(body)) return body;
  return `<g fill="${PALETTE[mainKey] || '#4a86e8'}">${body}</g>`;
}

const out = {};
const order = Object.keys(MAP).sort((a, b) => a.localeCompare(b));
for (const id of order) {
  if (SKIP.has(id)) continue;
  /* 社交组：品牌官方图形（simple-icons，用户 m02896 决策） */
  if (SOCIAL[id]) { out[id] = siBody(id); continue; }
  const [name, why] = MAP[id];
  const ic = park.icons[name];
  if (!ic) { console.error('MISSING park icon:', id, '←', name); continue; }
  const [main, aux] = TINT[id] || ['b', 'c'];
  // 深底组（任务栏/托盘/页脚社交/播放器）：描边统一白；浅底组统一灰蓝 G。
  const strokeKey = DARKBG_IDS.has(id) && !id.startsWith('icon-media-') ? 'w' : undefined;
  let body = recolor(ic.body, main, aux, strokeKey);
  if (/^(icon-media-|icon-social-)/.test(id)) {
    /* 播放器（m00386：加粗线条+站内深蓝）/社交：线条化后统一染主色。
       stripFill 去 fill 后，白描边（源内线/高光）与 #000 一起染成主蓝。
       加粗：IconPark 源 stroke-width=4（48 空间，16px 显示≈1.33px）→ 5.6（≈1.87px）。 */
    body = stripFill(body)
      .replace(/stroke="#[Ff]{3}(F{3})?"/g, `stroke="${PALETTE[main] || '#4a86e8'}"`)
      .replace(/#[0-9a-fA-F]{6}/g, PALETTE[main] || '#4a86e8');
    if (id.startsWith('icon-media-')) {
      body = body.replace(/stroke-width="[^"]*"/g, 'stroke-width="5.6"')
                 .replace(/<(path|rect|circle|ellipse|polygon)\b(?![^>]*stroke-width=)([^>]*?)(\/?)>/g,
                          (m, tag, attrs, self) => `<${tag}${attrs} stroke-width="5.6"${self ? ' />' : '>'}`);
    }
  } else if (WHITE_LINE.has(id)) {
    /* 白色线条图标（用户 m00604/m00789）：chart/compass/search 只在蓝底标题栏
     * 使用 → 整体染白。m01170：compass/search 保留一处橙色点缀
     *（v3 暖色轮的观感），即 compass 指针顶针、search 放大镜镜片。 */
    body = body.replace(/stroke="[^"]*"/g, 'stroke="#ffffff"');
    if (id === 'icon-compass') {
      // 顶针：源 circle cx=24 cy=12 r=4 fill（原 #2F88FF）→ 橙
      body = body.replace(/(<circle\b[^>]*fill=")[^"]*(")/i, `$1${ORANGE_ACCENT}$2`);
    } else if (id === 'icon-search') {
      // 镜片：源首条 path（封闭圆，fill 原 #2F88FF）→ 橙；高光弧保持白描边
      body = body.replace(/(<path\b[^>]*?fill=")[^"]*(")/i, `$1${ORANGE_ACCENT}$2`);
    }
  } else if (id === 'tray-sun' || id === 'tray-moon') {
    /* 纯黄剪影（用户 m01170：黄日/黄月上的白射线/白描边也一并染黄）：
     * recolor 只换 #2F88FF/#43CCF8/#000，源里的 fill="#fff"（日芒）与
     * stroke="#fff"（轮廓）会残留白 → 统一替换成主黄。 */
    body = body
      .replace(/fill="#fff(?:fff)?"/gi, `fill="${PALETTE[main] || '#ffd24a'}"`)
      .replace(/\sstroke="#fff(?:fff)?"/gi, '');
  } else if (id === 'icon-gamepad') {
    /* 手柄十字/圆键与外线同色（用户 m00789）：源里十字是 stroke="#fff"、
     * 圆键描边也是 #fff，recolor 只换 #2F88FF/#43CCF8/#000，#fff 会残留
     * → 统一替换成描边色 G。 */
    body = body.replace(/stroke="#fff(?:fff)?"/gi, `stroke="${PALETTE_HEX.G}"`);
  } else if (FILL_CLOSED.has(id)) {
    /* 全封闭图标补主色填充（用户 m00386 需求1） */
    const mainHex = PALETTE_HEX[main] || '#2F88FF';
    body = body.replace(/<path\b([^>]*?)\/?>/g, (m, attrs) => {
      if (/fill=/.test(attrs)) return m;
      const d = (attrs.match(/ d="([^"]*)"/) || [])[1] || '';
      const closedByZ = /z/i.test(d);
      const isClipboardMain = id === 'icon-clipboard' && d.startsWith(CLIPBOARD_MAIN_D);
      if (!closedByZ && !isClipboardMain) return m;
      return `<path${attrs} fill="${mainHex}">`;
    });
  }
  out[id] = tintBodyless(body, main);
}
/* 特例覆盖：开始徽标（四色方块）与绘画（彩色调色盘）为自绘 */
out['tray-start'] = START_LOGO;
out['icon-art-guide'] = PALETTE_DISH;

/* 兔子站标（用户 m02795：withicons:rabbit-solid 剪影——去掉五官子路径，
   纯色朱红 #E54E1F 填充。24 空间单 path → scale(2) 到 48，居中微调 translate。 */
{
  const D_MAIN = 'm6.88 1.58l-.32.11l-.32.18l-.32.27l-.27.34l-.29.72l-.17 1.04l-.01.8l.05.64l.16.96l.21.88l.39 1.2l.28.72l.9 1.84l-.77.82l-.64.96l-.41.86l-.26.88l-.16 1.12l.01.8l.17 1.04l.35.96l.3.56l.34.48l.44.48l.42.35l.8.53l.5.24l1.18.38l1.04.18l.88.07l1.76-.03l1.44-.21l1.2-.4l.64-.32l.58-.39l.54-.46l.44-.5l.36-.53l.3-.59l.25-.72l.14-.72l.07-.96l-.08-.88l-.17-.8l-.25-.72l-.26-.56l-.38-.64l-.42-.55l-.69-.73l.6-1.2l.55-1.28l.45-1.36l.24-1.12l.15-1.28l-.01-.8l-.15-.96l-.26-.71l-.31-.41l-.38-.32l-.35-.18l-.4-.11l-.48-.01l-.48.09l-.48.2l-.4.26l-.48.39l-.48.52l-.4.53l-.45.71l-.38.72l-.39.88L12 7.45L11.52 6l-.66-1.44l-.54-.91l-.72-.92l-.72-.65l-.72-.4l-.64-.15Z';
  out['icon-user'] = `<g transform="scale(2)"><path fill="#E54E1F" fill-rule="evenodd" d="${D_MAIN}"/></g>`;
}

/* 调色板卡片（用户 m02437：「绘画」瓦片图标要像彩色调色盘）——与 icon-art-guide 同款自绘调色盘 */
out['icon-palette'] = PALETTE_DISH;

/* 自绘扳手（用户 m00710：IconPark 'tool' 源是单 path，辅色无处落色 → 自绘
 * 经典开口扳手剪影——大 C 形钳口在右上、杆身斜置左下，轮廓一笔连贯。
 * m01170：去掉橙色铆钉圆（用户要求），只留银杆单色。48 空间，描边 #6b7480。 */
const WRENCH_D = [
  // 一笔轮廓：从杆尾圆头起，沿杆身右侧上行 → 钳口外弧（大圆）→ 开口缺口 →
  // 钳口内弧 → 沿杆身左侧回到起点。钳口开口朝上偏右，C 形弧明显。
  'M12.2 43.2C10.6 44.8 8 44.8 6.4 43.2L4.8 41.6C3.2 40 3.2 37.4 4.8 35.8L19.4 21.2' +
  'C18.5 18.6 18.7 15.6 20 13.1C22 9.2 26.3 6.9 30.7 7.5C32.4 7.7 33.9 8.3 35.2 9.2' +
  'L29.3 15.1C28.5 15.9 28.5 17.2 29.3 18L30 18.7C30.8 19.5 32.1 19.5 32.9 18.7L38.8 12.8' +
  'C39.7 14.1 40.3 15.6 40.5 17.3C41.1 21.7 38.8 26 34.9 28C32.4 29.3 29.4 29.5 26.8 28.6Z',
].join('');
out['icon-wrench'] = [
  '<g stroke="#6b7480" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">',
  `<path fill="#dde3ec" d="${WRENCH_D}"/>`,
  '</g>',
].join('');

const body = `/* 自动生成：tools/icons/emit-smooth.js —— IconPark (Apache 2.0) 平滑多色方案
 * 值 = recolor 后的 SVG body（viewBox 0 0 48 48 空间），由 xp-icons.js 的
 * pixelSymbol/pixelGlyph 包 <g transform="scale(0.33333)"> 适配全站 16×16 壳。
 * 改配色去 park-recolor.js 的 TINT，改语义映射去 park-map.js，然后重跑：
 *   node tools/icons/emit-smooth.js
 */
module.exports = {
${Object.entries(out).map(([id, body]) => `  '${id}':\n    '${body.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(',\n')},
};
`;
fs.writeFileSync(path.join(__dirname, 'smooth-glyphs.js'), body);
console.log('written smooth-glyphs.js —', Object.keys(out).length, 'icons');
