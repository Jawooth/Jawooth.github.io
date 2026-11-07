// 把 IconPark 的固定蓝色体系按站内语义重新着色为 18 键色板（PALETTE 同源色值）
// 用法：node tools/icons/build-compare-preview.js（在本文件 recolor() 被引用时自动生效）
// 策略：不解析几何，只做颜色字符串替换：
//   #2F88FF（主填充蓝）→ 每图标指定的主色
//   #43CCF8（点缀浅蓝）→ 每图标指定的辅色（默认主色的亮阶）
//   #000（描边）→ 可选：深底场景换白描边？——不，保持黑描边（原始风格统一）
//   #fff（留白）→ 不动
// 每图标主色取自 scripts/xp-icons.js 的 PALETTE 语义（与现像素版配色对齐）
const PALETTE_HEX = {
  // 色键: [常规, 暗] —— 与 xp-icons.js PALETTE 一致（v 值来自摘要记录）
  w: '#ffffff', W: '#cfd8e3',
  s: '#f7f0dd', S: '#b9ac8b',
  g: '#dde3ec', G: '#6b7480',
  y: '#ffd24a', Y: '#b9790a',
  o: '#f79240', O: '#96470c',
  r: '#ef5b52', R: '#8f241d',
  b: '#4a86e8', B: '#1c3a70',
  n: '#0054e3', N: '#003dd7',   // 站内 XP 标题栏深蓝（媒体播放器线条专用）
  e: '#55b463', E: '#1e5c27',
  h: '#4a9e5c', c: '#9fd8f8', C: '#2f7fb8',
};

// 站内 id → [主色键, 辅色键]（辅色用于 #43CCF8 点缀；缺省 = 主色亮阶 c/w/y 视主色而定）
// 语义对齐 tools/icons/colors.js 的像素配色决策
const TINT = {
  // 内容 —— 标题栏图标避开蓝系（m00386 需求2：与蓝色窗口标题栏拉开色相差）
  'icon-clipboard':   ['y', 's'],      // 黄夹子米纸
  'icon-post':        ['o', 's'],      // 橙条纹米纸（原蓝，蓝底色差小 → 橙）
  'icon-tag':         ['y', 'b'],      // 黄底蓝孔
  'icon-chart':       ['w', 'w'],      // 白色线条（m00604，仅蓝底标题栏用；emit WHITE_LINE 染白）
  'icon-compass':     ['w', 'w'],      // 白色线条（m00789：与 chart 同为蓝底标题栏图标 → 整体白，emit WHITE_LINE 染白）
  'icon-search':      ['w', 'w'],      // 白色线条（m00789：蓝底标题栏用 → 整体白）
  'icon-clock':       ['y', 'r'],      // 黄钟红针（原蓝框 → 黄，蓝底区分）
  'icon-image':       ['y', 'e'],      // 黄框绿山（原天蓝 → 黄）
  'icon-lock':        ['y', 'G'],      // 金锁（原银灰，蓝底更显）
  'icon-calendar':    ['r', 'w'],      // 红顶白面
  'icon-copy':        ['g', 'o'],      // 灰纸橙影（原蓝影 → 橙）
  'icon-warn':        ['y', 'r'],      // 黄底红叹号
  'icon-critical':    ['r', 'y'],      // 红框黄叹号
  'icon-pin':         ['r', 'w'],      // 红图钉
  'icon-fallback':    ['G', 'w'],      // 灰问号
  'icon-book':        ['o', 's'],      // 橙书米页
  'icon-bulb':        ['y', 'w'],      // 黄灯白光
  'icon-notepad':     ['y', 'w'],      // 黄便签
  'icon-pencil':      ['o', 'y'],      // 橙杆黄芯
  'icon-palette':     ['y', 'r'],      // 调色板多彩点
  // 导航
  'nav-home':         ['r', 'b'],      // 红屋顶蓝门
  'nav-guides':       ['o', 's'],      // 橙书
  'nav-archives':     ['e', 'w'],      // 绿箱白盖（m00604：与 post/palette 橙黄族区分）
  'nav-thanks':       ['r', 'o'],      // 红心橙芯
  'nav-folder':       ['y', 's'],      // 黄夹
  // 托盘（在蓝任务栏上：主色走亮阶才可见）
  'tray-start':       ['w', 'c'],      // 白窗格
  'tray-vol-on':      ['w', 'c'],      // 白喇叭
  'tray-vol-off':     ['r', 'w'],      // 红叉
  'tray-sun':         ['y', 'y'],      // 黄日纯色（m00789：辅色也黄，整体纯黄无白芯）
  'tray-moon':        ['y', 'y'],      // 黄月纯色（m00789）
  'tray-power':       ['w', 'w'],      // 白电源（用户指定关机图标改白）
  // 媒体（全部站内深蓝单色线条：主色 n=#0054e3、辅色 N 深端、描边同染 n）
  'icon-media-note':  ['n', 'N'],
  'icon-media-prev':  ['n', 'N'],
  'icon-media-play':  ['n', 'N'],
  'icon-media-pause': ['n', 'N'],
  'icon-media-next':  ['n', 'N'],
  'icon-media-list':  ['n', 'N'],
  'icon-media-link':  ['n', 'N'],
  'icon-media-expand':['n', 'N'],
  'icon-media-collapse': ['n', 'N'],
  'icon-media-eye':   ['n', 'N'],
  'icon-media-dice':  ['n', 'N'],
  // 社交（2026-11-05 站主要求与播放器「相同颜色」：原本 b 浅蓝，改成与媒体组
  // 一致的站内 XP 深蓝 n/N。simple-icons 品牌组不读这张表，改色见 social-native.js）
  'icon-social-github':   ['n', 'N'],
  'icon-social-email':    ['n', 'N'],
  'icon-social-bilibili': ['n', 'N'],
  'icon-social-pixiv':    ['n', 'N'],
  'icon-social-web':      ['n', 'N'],
  'icon-social-bluesky':  ['n', 'N'],
  'icon-social-twitter':  ['n', 'N'],
  'icon-social-facebook': ['n', 'N'],
  'icon-social-rss':      ['n', 'N'],
  'icon-social-weibo':    ['n', 'N'],
  'icon-social-zhihu':    ['n', 'N'],
  'icon-social-redbook':  ['n', 'N'],
  // 点赞/待办
  'icon-like-off':    ['G', 'w'],      // 灰心
  'icon-like-on':     ['r', 'o'],      // 红心
  'icon-todo-done':   ['e', 'w'],      // 绿勾
  'icon-todo-doing':  ['y', 'b'],      // 黄钟
  'icon-todo-pending':['g', 'b'],      // 灰框
  // 游戏/工具卡片
  'icon-brick':       ['r', 'y'],      // 俄方多色块
  'icon-snake':       ['e', 'y'],      // 绿蛇黄腹
  'icon-puzzle':      ['o', 'y'],      // 橙拼图
  'icon-calc':        ['g', 'e'],      // 灰壳绿屏
  'icon-gamepad':     ['c', 'G'],      // 天蓝壳；十字/圆键与外线同色 G（m00789）
  'icon-duck':        ['y', 'w'],      // 黄鸭（m00789：汁本计数器窗口标题）
  'icon-wrench':      ['g', 'o'],      // 浅银扳手橙钉（m00604：钉与壳区分度）
  'icon-game-guide':  ['b', 'r'],      // 手柄红点
  'icon-art-guide':   ['y', 'r'],      // 色卡多彩
  'icon-tech-guide':  ['e', 'o'],      // 绿 cpu 橙芯
  'icon-menu':        ['G', 'w'],
  'icon-close':       ['G', 'w'],
  'icon-arrow-left':  ['b', 'w'],
  'icon-arrow-right': ['b', 'w'],
};

// 主色键 → 对应 #43CCF8 的替换色（辅色亮阶）
const LIGHT_OF = { w: 'w', W: 'w', s: 'w', S: 's', g: 'w', G: 'g', y: 'w', Y: 'y', o: 'y', O: 'o', r: 'y', R: 'r', b: 'c', B: 'b', n: 'N', N: 'n', e: 'y', E: 'e', h: 'y', c: 'w', C: 'c' };

// 描边色（替换 #000）：避免纯黑/纯白 → 用站内色板的暗阶作描边，与主色同系
// 规则：主色亮（w/y/c/s/g）→ 深灰蓝描边；主色中（b/r/o/e）→ 同系暗阶描边；无主色图标 → 通用深灰
const STROKE_DARK = {
  w: 'G', W: 'G', s: 'G', S: 'G', g: 'G', G: 'G',
  b: 'G', B: 'G', c: 'G', C: 'G',
  n: 'N', N: 'N',
  y: 'G', Y: 'G', o: 'G', O: 'G', r: 'G', R: 'G',
  e: 'G', E: 'G', h: 'G',
};
const STROKE_FALLBACK = 'G'; // 未配主色的图标：灰蓝暗阶（非纯黑）

/* 深底组（任务栏/托盘/页脚社交/播放器）：描边统一白色，浅底组统一灰蓝 G */
const DARKBG_IDS = new Set([
  'tray-start', 'tray-vol-on', 'tray-vol-off', 'tray-sun', 'tray-moon', 'tray-power',
  ...Object.keys(TINT).filter((k) => k.startsWith('icon-social-') || k.startsWith('icon-media-')),
]);

function recolor(body, mainKey, auxKey, strokeKey) {
  const main = PALETTE_HEX[mainKey] || '#2F88FF';
  const aux = PALETTE_HEX[auxKey || LIGHT_OF[mainKey]] || main;
  const stroke = PALETTE_HEX[strokeKey || STROKE_DARK[mainKey] || STROKE_FALLBACK];
  return body
    .replace(/#2F88FF/gi, main)
    .replace(/#43CCF8/gi, aux)
    .replace(/#000/gi, stroke);
}

module.exports = { recolor, TINT, PALETTE_HEX, STROKE_DARK, DARKBG_IDS };
