/* global hexo */
/**
 * 底部 XP 任务栏 + 开始菜单
 *
 * 结构说明：
 *   - 样式已全部移入 source/css/xp-custom.css（可缓存，不再每页内联 3.5KB）
 *   - 本文件只保留 HTML 骨架与交互 JS
 *   - 待办窗口改为构建期注入（见 scripts/xp-enhance.js），不再运行时插 DOM
 */

const SITE_TITLE = (hexo.config && hexo.config.title) || '我的小站';
/* ⚠ 这个兜底值故意和 scripts/xp-enhance.js 里的 '' 不同：那边用空串当
   「不补标题后缀」的开关，这边是关机错误框/蓝屏上的显示文案，必须有个能看的名。 */

/* ---------------------------------------------------------------- 页面图标（导航的唯一真源） */
/* 一个页面的图标在站内会出现三处：
      ① 底部任务栏左侧那个「当前页面」按钮（运行时按 URL 取）
      ② 开始菜单的每一行
      ③ 首页「快速导航」四个瓦片
   2026-10-18 站主指出 ①②（开始菜单）与 ③（瓦片）对同一个页面给了两张不同的图
   （瓦片是自己手写的另一套 SVG）。修法不是把两套对齐，而是**只留这一套**：
     · 这里改了名，**一个页面只有一个图标**；
     · `xp_page_icon` tag 把它输出成 SVG 给开始菜单 / 任务栏用；
     · `xp_nav_tiles` helper 把**同一份图标**包成首页瓦片。
   以后想让某页换个图标，改这里一处，三处一起变。

   ★ 2026-10-22 像素风重设计：图案不再手写 <path>/<rect>，改由 scripts/xp-icons.js
     的 ASCII 16×16 点阵统一供给（与窗口标题图标同一份画的真源；16×16 在 16px
     显示尺寸下 1 格 = 1 物理像素）。
     nav-home/nav-guides/nav-archives/nav-thanks/icon-fallback 为导航专属；
     icon-palette/icon-post/icon-gamepad/icon-wrench 与窗口标题图标共用同一张画；
     托盘四件（开始/音量×2/日夜/关机）也从库里取（tray-* 图案）。 */
const { pixelGlyph, GLYPHS: PIX_GLYPHS } = require('./xp-icons');

/* 从点阵库取图案；缺图案直接抛错 —— 宁可构建期炸，也别上线后画出空白图标。 */
function pixOrThrow(id) {
  if (!PIX_GLYPHS[id]) throw new Error(`xp-taskbar: xp-icons.js 里没有图案 "${id}"`);
  return pixelGlyph(id);
}

const START_ICONS = {
  '/': pixOrThrow('nav-home'),               /* 橙墙小屋（像素） */
  '/works/': pixOrThrow('icon-palette'),     /* 调色板，与窗口标题同一张画 */
  /* 「文章」：蓝头纸 —— 导航把「文章」和「杂谈」合并成了「文字」（见
     _config.minimalism.yml 里 Essays: /blog/ 那段），这张纸**挪给「文字」用**。
     /guides/ 现在只是一张跳转页，留个图标是给任务栏「当前页面」认路的。 */
  '/blog/': pixOrThrow('icon-post'),         /* 蓝头纸，与窗口标题 icon-post 同一张画 */
  '/games/': pixOrThrow('icon-gamepad'),     /* 像素手柄 */
  '/tools/': pixOrThrow('icon-wrench'),      /* 斜扳手 */
  '/guides/': pixOrThrow('nav-guides'),      /* 气泡（跳转页认路用） */
  '/archives/': pixOrThrow('nav-archives'),  /* 档案盒 */
  /* 致谢页（/thanks/）不在导航里，所以不会出现在开始菜单；但任务栏的
     "当前页面"图标要认它，否则会退化成兜底的文档图标（2026-10-15 补）。 */
  '/thanks/': pixOrThrow('nav-thanks')       /* 像素爱心 */
};
/* 兜底图标：一张折角文档（导航里加了未知页面、或打开了文章/作品详情页时用）。
   配色用"白纸 + 深蓝描边"：任务栏按钮是浅灰底、开始菜单是白底，
   这种配色的对比度在两种底色上都够（2026-10-15 统一）。
   2026-10-22 起也走像素点阵（icon-fallback，画在 xp-icons.js）。 */
const START_ICON_FALLBACK = pixOrThrow('icon-fallback');

/* 页面显示名：一律由 buildPageTitles() 从导航配置（_config.minimalism.yml 的 menu）
   生成。曾有一份 START_NAMES 常量表当「helper 不传名字时的兜底」，但它没有任何
   读取者（xp_nav_tiles 的名字实际也走 buildPageTitles 那张表），2026-10-19 清理时删除。 */

/* ⚠ 必须是**函数**、不能是立即执行的 IIFE：
   Hexo 加载 scripts/ 的时机早于主题配置合并，IIFE 在这里读 hexo.theme.config.menu
   会读到 undefined（现象是开始菜单整个空白，2026-10-14 踩过）。
   改成函数后，真正的读取发生在模板渲染时，那时配置已经就绪。
   下面 buildStartItems / buildPageTitles 都要读同一份菜单，统一走这个取值函数，
   免得以后有人「顺手」把其中一处提到模块作用域又踩同一个坑。 */
function themeMenu() {
  return (hexo.theme.config && hexo.theme.config.menu) || {};
}

function buildStartItems() {
  const menu = themeMenu();
  const entries = Object.keys(menu)
    .map((k) => menu[k])
    .filter((it) => it && it.url && it.name);
  if (!entries.length) return '';       // 配置读不到就渲染空菜单，不报错
  return entries.map((it) => {
    const url = String(it.url);
    const glyph = START_ICONS[url] || START_ICON_FALLBACK;
    /* 外链（External: true）在新标签打开，与导航菜单行为保持一致 */
    const ext = it.External === true ? ' target="_blank" rel="noopener"' : '';
    return '    <a class="xp-start-item" href="' + url + '" role="menuitem"' + ext + '>\n' +
      '      <svg class="xp-start-icon" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true">' + glyph + '</svg>\n' +
      '      <span class="xp-start-text">' + String(it.name) + '</span>\n' +
      '    </a>';
  }).join('\n');
}

// ---------------------------------------------------------------- 任务栏 HTML
/* ⚠ 是函数不是常量：里面的 ${buildStartItems()} 要读主题配置（menu），
   而常量会在模块加载时就把值定死 —— 那时配置还是空的（见上面的说明）。 */
function taskbarHTML() {
  return `
<!-- 阅读进度条（2026-11-05）。贴在窗口最顶端、任务栏之外的一条 3px 细线。
     放在这里而不是文章模板里：任务栏脚本每页都注入，而进度条只需要 DOM
     里有一个元素 —— 有没有正文由 initReadBar() 判断，没有就不显示。
     用 CSS 变量控制高度，方便和任务栏的缩放保持一致。 -->
<div class="xp-readbar" id="xpReadBar" role="progressbar" aria-label="阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden>
  <div class="xp-readbar-fill" id="xpReadFill"></div>
</div>
<!-- XP 底部任务栏 -->
<div class="xp-taskbar">
  <div class="xp-taskbar-left">
    <button class="xp-start-btn" id="xpStartBtn" type="button" title="开始菜单" aria-haspopup="true" aria-expanded="false" aria-controls="xpStartMenu">
      <svg class="xp-start-icon" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true"><g>${pixOrThrow('tray-start')}</g></svg>
      <span class="xp-start-text">开始</span>
    </button>
  </div>

  <div class="xp-taskbar-center">
    <div class="xp-taskbar-item active" id="xpTaskbarItem">
      <!-- 图标内容由 setCurrentPage() 按当前页面的 URL 从 START_ICONS 取，
           与开始菜单里那一项**同一个图标**（2026-10-15 站主要求两处对应）。
           这里先放兜底的文档图标：JS 跑起来前的一瞬间、或 JS 被禁用时也说得过去。 -->
      <svg class="xp-taskbar-icon" id="xpTaskbarIcon" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true">${START_ICON_FALLBACK}</svg>
      <span class="xp-taskbar-title" id="xpTaskbarTitle">页面</span>
    </div>
  </div>

  <div class="xp-taskbar-right">
    <!-- 回到顶部（2026-11-05 站主按优先度批准的功能之一）。
         做成托盘小按钮而不是页脚浮球：本站的常驻 chrome 就是任务栏，
         浮球会压内容（播放器就为此从右下角浮层改成页内），托盘天然不占地。
         默认 hidden，滚动超过一屏才出现 —— 在页面顶部时它没有意义。
         箭头手绘、不走图标管线：node_modules 里 icon-park 的包是空的，
         现在无法重跑 emit-smooth，加新 id 会构建失败（见 README 第 14 节）。 -->
    <button class="xp-tray-btn" id="xpTopBtn" type="button" title="回到顶部" aria-label="回到顶部" hidden>
      <svg viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true"><path d="M8 3.2L3.1 8h2.6v4.8h4.6V8h2.6z" fill="currentColor"/></svg>
    </button>
    <button class="xp-tray-btn" id="xpVolumeBtn" type="button" title="静音 / 取消静音" aria-pressed="false" aria-label="静音切换">
      <svg id="xpVolOn" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true"><g>${pixOrThrow('tray-vol-on')}</g></svg>
      <svg id="xpVolOff" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true" style="display:none"><g>${pixOrThrow('tray-vol-off')}</g></svg>
    </button>
    <button class="xp-tray-btn" id="xpThemeBtn" type="button" title="切换深色模式" aria-pressed="false" aria-label="切换深色模式">
      <svg id="xpThemeSun" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true"><g>${pixOrThrow('tray-sun')}</g></svg>
      <svg id="xpThemeMoon" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true" style="display:none"><g>${pixOrThrow('tray-moon')}</g></svg>
    </button>
    <div class="xp-taskbar-clock" id="xpClock">
      <span id="xpClockTime">--:--</span>
      <span class="xp-clock-date" id="xpClockDate"></span>
    </div>
  </div>
</div>

<!-- 开始菜单（默认隐藏） -->
<div class="xp-start-menu" id="xpStartMenu" role="menu" aria-label="开始菜单">
  <div class="xp-start-menu-header">
    <span class="xp-start-menu-user">
      <svg class="xp-user-avatar" viewBox="0 0 48 48" width="1.3em" height="1.3em" aria-hidden="true"><use href="#icon-user"/></svg>
      ${SITE_TITLE}
    </span>
  </div>
  <div class="xp-start-menu-body">
${buildStartItems()}
  </div>
  <div class="xp-start-menu-footer">
    <button type="button" class="xp-shutdown" id="xpShutdown">
      <svg class="xp-shutdown-icon" viewBox="0 0 16 16" width="1.2em" height="1.2em" aria-hidden="true"><g fill="currentColor">${pixOrThrow('tray-power').replace(/fill="#1a1a1a"/g, 'fill="currentColor"')}</g></svg>
      <span>${shutdownText().button}</span>
    </button>
  </div>
</div>
`;
}

/* 任务栏「当前页面名」的查表：由导航菜单生成（url → name），
   再补几个导航里没有、但确实存在的页面。 */
function buildPageTitles() {
  const menu = themeMenu();
  const map = {};
  Object.keys(menu).forEach((k) => {
    const it = menu[k];
    if (it && it.url && it.name) map[String(it.url)] = String(it.name);
  });
  map['/tags/'] = '标签';
  map['/categories/'] = '分类';
  /* 致谢页不在导航里，但任务栏标题也该显示干净的「致谢」而不是
     document.title 拼出来的「致谢 | 我的小站」（2026-10-15 补）。 */
  map['/thanks/'] = '致谢';
  return map;
}

/* 关机彩蛋的文案：全部读 _config.yml 的 shutdown: 段（站主改文案不用进 JS）。
   任何一项没配都有内置兜底，所以删掉整段配置也不会把彩蛋弄坏。 */
function shutdownText() {
  const c = (hexo.config && hexo.config.shutdown) || {};
  const str = (v, dflt) => (v === undefined || v === null || v === '') ? dflt : String(v);
  const arr = (v, dflt) => (Array.isArray(v) && v.length) ? v.map(String) : dflt;
  return {
    /* 音效开关：见 shutdownText 上方注释的两层开关说明。 */
    sound: c.sound === undefined ? true : (c.sound === true || c.sound === 'true'),
    button: str(c.button, '关机'),
    errorTitle: str(c.error_title, SITE_TITLE),
    errorLines: arr(c.error_lines, ['关闭计算机时发生严重错误。', '系统即将停止响应，未保存的内容将会丢失。']),
    errorOk: str(c.error_ok, '确定'),
    bsHead: str(c.bs_head, '{site} 遇到问题需要关闭').replace(/\{site\}/g, SITE_TITLE),
    bsLines: arr(c.bs_lines, ['一个问题已经发生，Windows 需要重新启动。我们只收集某些错误信息，然后为你重新启动。']),
    bsProgressSuffix: str(c.bs_progress_suffix, '完成'),
    bsCode: str(c.bs_code, '停止代码：SITE_EASTER_EGG_NOT_SUPPORTED'),
    bsFoot: str(c.bs_foot, '点击任意位置（或按任意键）重启你的浏览器')
  };
}

// ---------------------------------------------------------------- 任务栏 JS
function taskbarJS() {
return `
(function() {
  // ========== 时钟（时间 + 日期） ==========
  /* 2026-10-19 站主要求的两组交互：
     ① 点击时钟 → 12/24 小时制切换（记 localStorage，下次进来保持选择）；
     ② 悬停（移动端没有 hover，用长按 500ms 代替）→ 显示完整日期
        「2026年10月19日 星期一」。悬停用 title 属性兜底（触屏没 title，但长按已覆盖）。
     12 小时制带 am/pm 后缀（2026-10-19 站主定稿，原「上午/下午」前缀）；两种制式都由 updateClock 统一渲染。 */
  var CLOCK_TIP = function (now) {
    var weeks = ['日', '一', '二', '三', '四', '五', '六'];
    return now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 星期' + weeks[now.getDay()];
  };
  function use24() {
    try { return localStorage.getItem('xp-clock-24') !== '0'; } catch (e) { return true; }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function updateClock() {
    var now = new Date();
    var timeEl = document.getElementById('xpClockTime');
    var dateEl = document.getElementById('xpClockDate');
    var clockEl = document.getElementById('xpClock');
    if (clockEl) clockEl.title = CLOCK_TIP(now);
    if (timeEl) {
      if (use24()) {
        timeEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
      } else {
        var h = now.getHours() % 12; if (h === 0) h = 12;
        timeEl.textContent = h + ':' + pad(now.getMinutes()) + (now.getHours() < 12 ? 'am' : 'pm');
      }
    }
    if (dateEl) dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日';
  }
  updateClock();
  setInterval(updateClock, 15000);
  (function () {
    var clockEl = document.getElementById('xpClock');
    if (!clockEl) return;
    clockEl.classList.add('xp-clock-clickable');
    /* 点一下切制式；长按 500ms 弹完整日期。用 pointer 事件统一鼠标/触屏。 */
    var pressTimer = null;
    function showFullDate() {
      if (clockEl.getAttribute('data-xp-full-date')) return;   /* 已经开着就不重复弹 */
      var tip = CLOCK_TIP(new Date());
      clockEl.setAttribute('data-xp-full-date', tip);
      var tipEl = document.createElement('div');
      tipEl.className = 'xp-clock-fulltip';
      tipEl.textContent = tip;
      clockEl.appendChild(tipEl);
      /* 3 秒后自动收起；期间再点一下也能收 */
      clockEl.__xpTipTimer = setTimeout(hideFullDate, 3000);
    }
    function hideFullDate() {
      clearTimeout(clockEl.__xpTipTimer);
      clockEl.removeAttribute('data-xp-full-date');
      var t = clockEl.querySelector('.xp-clock-fulltip');
      if (t) t.parentNode.removeChild(t);
    }
    clockEl.addEventListener('pointerdown', function () {
      pressTimer = setTimeout(showFullDate, 500);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      clockEl.addEventListener(ev, function () { clearTimeout(pressTimer); });
    });
    clockEl.addEventListener('click', function (e) {
      e.stopPropagation();
      if (clockEl.getAttribute('data-xp-full-date')) { hideFullDate(); return; }  /* 提示开着时点=收起 */
      try { localStorage.setItem('xp-clock-24', use24() ? '0' : '1'); } catch (err) {}
      updateClock();
    });
  })();

  // ========== 当前页面的标题与图标 ==========
  /* 图标表与开始菜单同源（START_ICONS），构建期序列化进来 —— 两边永远一致，
     不会出现"开始菜单改了图标、任务栏还是旧的"（2026-10-15 站主要求两处对应）。 */
  var PAGE_ICONS = ${JSON.stringify(START_ICONS)};
  var PAGE_ICON_FALLBACK = ${JSON.stringify(START_ICON_FALLBACK)};
  /* 同一张表挂到 window 上：页面里临时要插个图标（错误提示之类）可以取这里。
     首页「快速导航」瓦片不靠它 —— 那些是在构建期由 xp_page_icon 标签直接渲染好的。 */
  try { window.hexo_page_icons = PAGE_ICONS; } catch (e) {}
  function setCurrentPage() {
    var path = window.location.pathname.replace(/index\\.html$/, '');
    /* 任务栏左下角那个「当前页面名」也读导航配置（由构建期注入 PAGE_TITLES），
       免得导航改名后这里还显示旧名字（2026-10-14 同一个坑踩了两次）。 */
    var pages = ${JSON.stringify(buildPageTitles())};
    var title = pages[path] || document.title || '页面';
    var titleEl = document.getElementById('xpTaskbarTitle');
    if (titleEl) titleEl.textContent = title;
    var item = document.getElementById('xpTaskbarItem');
    if (item) item.setAttribute('title', title);

    /* 图标：与开始菜单**同一份 START_ICONS**，按 URL 取（2026-10-15 站主要求两处对应）。
       取不到就退成兜底的文档图标 —— 文章/作品详情页的 URL 不在导航里，走这一支。 */
    var iconEl = document.getElementById('xpTaskbarIcon');
    if (iconEl) iconEl.innerHTML = PAGE_ICONS[path] || PAGE_ICON_FALLBACK;
  }
  setCurrentPage();

  // ========== 开始菜单 ==========
  var startBtn = document.getElementById('xpStartBtn');
  var startMenu = document.getElementById('xpStartMenu');

  function setMenu(open) {
    if (!startMenu) return;
    startMenu.classList.toggle('show', open);
    if (startBtn) startBtn.setAttribute('aria-expanded', String(open));
  }
  function toggleStartMenu() {
    if (!startMenu) return;
    setMenu(!startMenu.classList.contains('show'));
  }
  function onDocumentClick(e) {
    if (!startMenu || !startMenu.classList.contains('show')) return;
    if (!startMenu.contains(e.target) && !(startBtn && startBtn.contains(e.target))) setMenu(false);
  }

  if (startBtn) {
    startBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleStartMenu(); });
  }
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') setMenu(false);
  });

  // ========== 深色模式 ==========
  function applyThemeUI(isDark) {
    var sun = document.getElementById('xpThemeSun');
    var moon = document.getElementById('xpThemeMoon');
    var btn = document.getElementById('xpThemeBtn');
    if (sun) sun.style.display = isDark ? 'none' : '';
    if (moon) moon.style.display = isDark ? '' : 'none';
    if (btn) btn.setAttribute('aria-pressed', String(isDark));
  }
  function toggleDarkMode() {
    var html = document.documentElement;
    var isDark = html.classList.toggle('dark');
    try { localStorage.setItem('use-color-scheme', isDark ? 'dark' : 'light'); } catch (err) {}
    applyThemeUI(isDark);
  }
  var themeBtn = document.getElementById('xpThemeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleDarkMode(); });
  }
  applyThemeUI(document.documentElement.classList.contains('dark'));

  // ========== 回到顶部（托盘按钮） ==========
  /* 出现时机：滚过一屏才显示。顶部时隐藏，否则它在「本来就在顶部」的页面上
     什么也做不了，白占托盘位置。
     滚动监听用 passive + rAF 节流：scroll 事件每帧都可能触发，直接改 DOM 会掉帧。 */
  function initBackToTop() {
    var btn = document.getElementById('xpTopBtn');
    if (!btn) return;
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var maxY = Math.max(0, (document.documentElement.scrollHeight || 0) - vh);
      /* 阈值取「0.9 屏」与「整页可滚动距离的一半」里较小的那个。
         为什么不能只写 0.9 屏：短文整页只能滚 805px 而视口 900px，
         0.9 屏 = 810 > 805 ⇒ 按钮永远不出现（实测 /about-me/ 滚到底仍 hidden）。
         另外 maxY 很小时（页面本来就一屏）干脆不显示 —— 它没有意义。 */
      var need = Math.min(vh * 0.9, maxY * 0.5);
      var show = maxY > 120 && y > need;
      /* 状态已经对了就别再动 DOM。注意是「hidden === !show」——
         写成「show === hidden」会把逻辑整个反过来（今天真踩过：
         滚到底按钮仍然不出现）。 */
      if (btn.hidden === !show) return;
      if (show) btn.removeAttribute('hidden'); else btn.setAttribute('hidden', '');
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(update);
      else setTimeout(update, 60);
    }, { passive: true });
    window.addEventListener('resize', update);
    btn.addEventListener('click', function () {
      /* 尊重系统的「减少动态效果」：开了就别滚，直接跳。
         matchMedia 不存在时（老浏览器）按需要平滑处理。 */
      var reduce = false;
      try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (err) {}
      try {
        window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
      } catch (err) {
        window.scrollTo(0, 0);          /* 不支持对象参数时退回两参数形式 */
      }
      /* 键盘用户点完，焦点留在按钮上会看不见自己在哪 —— 送回文档开头。 */
      var main = document.querySelector('main') || document.body;
      if (main && main.focus) {
        try { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); } catch (err) {}
      }
    });
    update();
  }
  initBackToTop();

  // ========== 阅读进度条（只在有正文的页面上出现） ==========
  /* 为什么放在任务栏脚本里而不是文章模板：它要跟着滚动实时算，
     而任务栏脚本本来就每页都跑、且已经有一个滚动监听（回到顶部）。
     用 .post-content 的存在与否当开关：没有正文的页面（首页/列表页/致谢…）
     直接退出，一条线都不出现。 */
  function initReadBar() {
    var bar = document.getElementById('xpReadBar');
    var fill = document.getElementById('xpReadFill');
    var body = document.querySelector('.post-content');
    if (!bar || !fill || !body) return;
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var maxY = Math.max(0, (document.documentElement.scrollHeight || 0) - vh);
      /* 进度按「整页可滚动距离」算，不按正文元素算。
         试过按 .post-content 自身算，短文章上完全不成立 —— 实测 /about-me/ 的正文
         只比视口高 152px，那条线只在 150px 的滚动窗口里闪一下就到 100% 然后隐藏，
         等于没有。整页口径虽然把页脚那 100 多 px 也算进去，但单调、可预期，
         和读者「我这页看到哪了」的直觉一致。 */
      var p = maxY > 0 ? y / maxY : 0;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      /* 页顶不显示（还没开始读）；页面本来就一屏时不显示（没有进度可言）。 */
      var show = maxY > 120 && y > 40 && p > 0.005;
      /* ⚠ 判断写「!==」不是「===」：hidden 与 show 应当是相反的，
         hidden === !show 表示「状态已经对了」，这时什么都不用做。
         写成 === 再进分支，就等于「状态对了才去改」，会把该显示的按回隐藏 ——
         今天在回到顶部那一份上踩过同样的反转，这里是第二次。 */
      if (bar.hidden !== !show) {
        if (show) bar.removeAttribute('hidden'); else bar.setAttribute('hidden', '');
      }
      fill.style.width = (p * 100).toFixed(2) + '%';
      bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(update);
      else setTimeout(update, 60);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  initReadBar();

  // ========== 托盘音量：静音 / 取消静音（对所有音频生效） ==========
  var muted = false;
  function applyMute() {
    var media = document.querySelectorAll('audio, video');
    for (var i = 0; i < media.length; i++) media[i].muted = muted;
    /* 2026-11-02：音乐播放器的 <audio> 是 APlayer 运行时 createElement 出来的，
       从不挂进 DOM —— 上面那句 querySelectorAll 抓不到它。以前点托盘喇叭对音乐
       一点用都没有。播放器把这一路暴露成 window.__XP_AUDIO__，这里一起管住。 */
    if (window.__XP_AUDIO__) window.__XP_AUDIO__.muted = muted;
    /* 播放器可能比任务栏晚初始化（脚本顺序 / 网络慢），把静音状态也挂出去，
       播放器建好 audio 时自己读这一份，免得「先点了静音，播放器后来才响」。 */
    window.__XP_MUTED__ = muted;
    var on = document.getElementById('xpVolOn');
    var off = document.getElementById('xpVolOff');
    var btn = document.getElementById('xpVolumeBtn');
    if (on) on.style.display = muted ? 'none' : '';
    if (off) off.style.display = muted ? '' : 'none';
    if (btn) btn.setAttribute('aria-pressed', String(muted));
  }
  var volBtn = document.getElementById('xpVolumeBtn');
  if (volBtn) {
    volBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      muted = !muted;
      applyMute();
    });
  }

  // ========== 关机彩蛋（2026-10-14 站主要求） ==========
  /* 点开始菜单底部的「关机」→ 先弹一个模拟的系统错误窗口 → 关掉它之后进蓝屏
     → 点蓝屏任意处（或按任意键）恢复原样。
     纯前端演出，不会真的影响浏览器或系统；每一层都能退出来。
     音效与色散故障的定义紧跟其后（同一层作用域，三段共用 muted / shuttingDown）。 */
  var shuttingDown = false;

  /* ---- 关机音效 ----
     Web Audio 现场合成两声，不引入任何音频文件（与首页烟花/鸭叫同一套做法）：
       · 错误音：一声低沉的「咚」（方波下滑 + 低通），配错误弹窗
       · 关机音：声调持续下行的一段，配蓝屏（像 Windows 关机那段旋律的极简版）
     两层开关：托盘静音按钮优先，其次 _config.yml 的 shutdown.sound（构建期注入）。 */
  var audioCtx = null;
  var SOUND_ON = ${shutdownText().sound};   /* _config.yml 的 shutdown.sound（构建期注入） */
  function beep(kind) {
    if (muted || !SOUND_ON) return;       /* 托盘静音或配置关了，都不出声 */
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      var ctx = audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;

      if (kind === 'error') {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.34);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.36);
      } else if (kind === 'shutdown') {
        /* 下行的一串音，营造"关掉"的感觉 */
        [520, 392, 311, 233].forEach(function (f, i) {
          var o = ctx.createOscillator();
          var g = ctx.createGain();
          o.type = 'triangle';
          var s = t + i * 0.11;
          o.frequency.setValueAtTime(f, s);
          g.gain.setValueAtTime(0.0001, s);
          g.gain.exponentialRampToValueAtTime(0.13, s + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
          o.connect(g); g.connect(ctx.destination);
          o.start(s); o.stop(s + 0.24);
        });
      }
    } catch (e) { /* 音频不可用就算了，别把彩蛋搞挂 */ }
  }

  /* ========== 色散故障（两个"幕"共用，所以定义在这一层） ==========
     ⚠ 作用域教训：stopGlitch 最初定义在 shutdownSequence 内部，
     而 restore 在 showBlueScreen 里 —— 两个函数是**兄弟**不是嵌套，
     restore 调 stopGlitch 直接 ReferenceError（实测蓝屏点击无反应，
     CDP 抓到 Uncaught）。凡是要跨 shutdownSequence / showBlueScreen /
     restore 用的东西，都必须定义在这一层。 */
  var glitchTimer = null, slices = [];
  function startGlitch() {
    var reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (reduced) return;                    /* reduced-motion：CSS 那层也全部禁用 */
    document.documentElement.classList.add('xp-glitching');
    /* 两条撕裂条：top 由随机数决定，每 80ms 换一次，模拟信号横向撕开 */
    for (var gi = 0; gi < 2; gi++) {
      var sl = document.createElement('div');
      sl.className = 'xp-glitch-slice';
      document.body.appendChild(sl);
      slices.push(sl);
    }
    var jump = function () {
      for (var k = 0; k < slices.length; k++) {
        slices[k].style.top = Math.floor(Math.random() * 86) + '%';
        slices[k].style.transform = 'translateX(' + (Math.floor(Math.random() * 21) - 10) + 'px)';
      }
    };
    jump();
    glitchTimer = setInterval(jump, 80);
  }
  function stopGlitch() {
    if (glitchTimer) { clearInterval(glitchTimer); glitchTimer = null; }
    slices.forEach(function (s) { if (s.parentNode) s.parentNode.removeChild(s); });
    slices = [];
    document.documentElement.classList.remove('xp-glitching');
  }

  function shutdownSequence() {
    if (shuttingDown) return;
    shuttingDown = true;
    setMenu(false);
    beep('error');                        /* 第 1 幕配一声错误音 */

    /* 色散故障：点「关机」的瞬间挂上，**一直持续到进蓝屏才摘**（站主指定）。
       定义在上一层作用域（见 startGlitch/stopGlitch 上方的注释）。 */
    startGlitch();

    // ---- 第 1 幕：模拟系统错误窗口 ----
    var layer = document.createElement('div');
    layer.className = 'xp-error-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', '系统错误');

    var T = ${JSON.stringify(shutdownText())};
    var box = document.createElement('div');
    box.className = 'xp-window xp-error-dialog';
    box.innerHTML =
      '<div class="xp-window-title">' +
        '<span class="xp-window-title-text">' +
          '<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true">' +
            '<use href="#icon-warn"></use>' +
          '</svg> ' + T.errorTitle +
        '</span>' +
        '<span class="xp-window-btns" role="group" aria-label="窗口操作">' +
          /* ⚠ 这里刻意**不用** data-action="close"：页面里有个通用的窗口处理器
             （scripts/xp-content.js 的 document 级点击监听）会捕获所有 .xp-window-btn，
             走它那套「关闭后生成『恢复』chip」的逻辑。错误弹窗是临时浮层，
             关掉就该彻底消失，不该在左下角留一个恢复按钮（2026-10-14 站主发现）。
             所以这里用独立类名 + 自己的点击处理，绕开通用逻辑。 */
          '<i class="xp-window-btn xp-error-close" role="button" tabindex="0" aria-label="关闭">' +
            '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>' +
          '</i>' +
        '</span>' +
      '</div>' +
      '<div class="xp-window-body">' +
        '<div class="xp-error-row">' +
          '<div class="xp-error-icon" aria-hidden="true">' +
            '<svg width="34" height="34" viewBox="0 0 16 16">' +
              '<use href="#icon-critical"></use>' +
            '</svg>' +
          '</div>' +
          '<p class="xp-error-text">' + T.errorLines.join('<br>') + '</p>' +
        '</div>' +
        '<div class="xp-error-actions">' +
          '<button type="button" class="xp-btn xp-error-ok">' + T.errorOk + '</button>' +
        '</div>' +
      '</div>';

    layer.appendChild(box);
    document.body.appendChild(layer);
    var okBtn = box.querySelector('.xp-error-ok');
    if (okBtn) okBtn.focus();

    function next() {
      document.removeEventListener('keydown', onKey);
      if (layer.parentNode) layer.parentNode.removeChild(layer);
      stopGlitch();                         /* 故障覆盖整个错误窗阶段，进蓝屏才停 */
      showBlueScreen();
    }
    function onKey(e) { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); next(); } }

    if (okBtn) okBtn.addEventListener('click', next);
    var closeIco = box.querySelector('.xp-error-close');
    if (closeIco) closeIco.addEventListener('click', next);
    document.addEventListener('keydown', onKey);
  }

  // ---- 第 2 幕：蓝屏 ----
  function showBlueScreen() {
    beep('shutdown');                     /* 进蓝屏时来一段下行音 */
    var bs = document.createElement('div');
    bs.className = 'xp-bluescreen';
    bs.setAttribute('role', 'alertdialog');
    bs.setAttribute('aria-label', '系统已停止');
    var T = ${JSON.stringify(shutdownText())};
    bs.innerHTML =
      '<div class="xp-bs-inner">' +
        '<p class="xp-bs-head">' + T.bsHead + '</p>' +
        T.bsLines.map(function (l) { return '<p>' + l + '</p>'; }).join('') +
        '<p class="xp-bs-pct">0% ' + T.bsProgressSuffix + '</p>' +
        '<p class="xp-bs-code">' + T.bsCode + '</p>' +
        '<p class="xp-bs-foot">' + T.bsFoot + '</p>' +
      '</div>';
    document.body.appendChild(bs);

    // 百分比：0→100 循环，**每个数字都停留长一些、100% 停最久**（2026-10-14 站主指定）。
    // 实现：普通数字每档停 STEP_MS；到 100 后多停 HOLD_MS（4 倍）。
    // hold 用毫秒而不是"拍数"计时，两种停留就能各自独立调节。
    var pctEl = bs.querySelector('.xp-bs-pct');
    var pct = 0;
    var STEP_MS = 650;                     /* 普通数字每档停留（原 420ms，站主要求加长） */
    var HOLD_MS = 2600;                    /* 100% 的停留：约 4 倍于普通档，最显眼 */
    var holdLeft = 0;                      /* >0：正在 100% 停留，剩这么多毫秒 */
    function showPct() { if (pctEl) pctEl.textContent = pct + '% ' + T.bsProgressSuffix; }
    showPct();
    var timer = setInterval(function () {
      if (holdLeft > 0) {
        holdLeft -= STEP_MS;
        if (holdLeft <= 0) { pct = 0; showPct(); }   /* 停留结束：归零重走（必须显式归零，见下） */
        return;
      }
      /* ⚠ 归零必须在这里显式做：曾把 pct 留在 100 让下一轮 +随机数自然越界，
         结果永远 >100、永远再进停留分支 —— 卡死在 100% 不循环（实测 6.2 秒）。 */
      pct += Math.floor(Math.random() * 9) + 3;
      if (pct > 100) {
        pct = 100;
        holdLeft = HOLD_MS;
      }
      showPct();
    }, STEP_MS);

    /* 故障回收：正常路径在 next() → stopGlitch()（进蓝屏时）；
       restore() 兜住蓝屏阶段退出，顺带再收一次（幂等，重复调用无害）。 */

    function restore() {
      clearInterval(timer);
      stopGlitch();   /* 保险：错误窗阶段中途退出（不进蓝屏直接关）也立刻回收故障资源 */
      document.removeEventListener('keydown', restore);
      if (bs.parentNode) bs.parentNode.removeChild(bs);
      shuttingDown = false;
    }
    bs.addEventListener('click', restore);
    document.addEventListener('keydown', restore);
    /* 兜底：万一有人既不点也不按键，30 秒后自己退出来，别把页面永久锁住 */
    setTimeout(restore, 30000);
  }

  var sd = document.getElementById('xpShutdown');
  if (sd) sd.addEventListener('click', function (e) { e.stopPropagation(); shutdownSequence(); });
})();
`;
}

/* ⚠ 用 filter 而不是 injector.register 的直接传值：
   injector.register('body_end', 具体的字符串) 会在**模块加载那一刻**就求值，
   而那时主题配置（hexo.theme.config.menu）还没合并进来 —— 实测菜单读到空对象，
   开始菜单整个是白的（2026-10-14 踩了两轮才定位到）。
   改用 after_render:html 过滤器：它在**每次渲染 HTML 时**才执行，
   那时配置早已就绪，而且能顺手插到 </body> 之前，效果与 body_end 一致。
   taskbarJS()（约 13KB 无数据依赖的浏览器脚本）同样外链化成 /js/xp-taskbar.js：
   HTML 里只留一行 <script src>，全部页面共享缓存（审计报告 A 类第 1 条）。
   ⚠ 路由也是 generator：求值发生在**生成阶段**，配置早已合并 —— 不会再踩
     模块加载时读到空配置的坑。脚本内容随 HTML 一起在过滤器里拼版本号。
    ⚠ generator 必须返回 [{path, data}] 数组（返回映射对象会被 Hexo 8 静默丢弃）。 */
const crypto = require('crypto');
let taskbarJsVer = '';

hexo.extend.generator.register('xpjs_taskbar', () => {
  const content = taskbarJS();
  taskbarJsVer = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  return [{ path: 'js/xp-taskbar.js', data: content }];
});

hexo.extend.filter.register('after_render:html', (str) => {
  if (!str || str.indexOf('</body>') < 0) return str;
  const ver = taskbarJsVer ? `?v=${taskbarJsVer}` : '';
  return str.replace('</body>', taskbarHTML() + `\n<script src="/js/xp-taskbar.js${ver}" defer></script>\n</body>`);
});

/* ---------------------------------------------------------------- 图标标签（README 第 14 节） */
/* 一个页面只有一个图标，所有地方都从这里取（见上面 START_ICONS 的说明）。
   对外只暴露两个 tag：

     {% xp_page_icon /tools/ 32 %}   →  该页面的 <svg>（宽高默认 16）

   ⚠⚠ 为什么是 tag 不是 helper —— 踩过的坑，别再改回去：
     2026-10-18 给这里加过 `hexo.extend.helper.register('xp_page_icon', …)`，
     结果 Hexo **直接报 `unknown block tag: xp_page_icon`**，而且
     `hexo.extend.helper.list()` 里明明有这个名字（调试探针确认过）。
     两个 tag（xp_zzprobe / xp_page_icon）注册都正常，templates 里也能用；
     问题只出在 helper 上：脚本里一旦同时出现 `helper.register`，
     这个文件里的 helper 就不会进 nunjucks 的 helper 表。
     tag 没有这个毛病，所以**图标一律走 tag**。
     同理：想给模板加新的"输出 HTML 的东西"，优先 tag。
   ⚠ 参数写法是**空格分隔的裸值**（`{% xp_page_icon /tools/ 32 %}`），
     不要写成 `{% xp_page_icon "/tools/" 32 %}` —— Hexo 的 tag 参数是按空白切分后
     原样当字符串传进来的，加引号会把引号一起带进来（变成 `"/tools/"`），查不到图标。 */
hexo.extend.tag.register('xp_page_icon', function (args) {
  const url = String((args && args[0]) || '');
  const size = Number(args && args[1]) || 16;
  const glyph = START_ICONS[url] || START_ICON_FALLBACK;
  return '<svg viewBox="0 0 16 16" width="' + size + '" height="' + size + '" aria-hidden="true">' +
    glyph + '</svg>';
});

/* {% xp_pixel_rects nav-folder %}  →  只输出该图案的 <rect> 串（不带 <svg> 壳）。
   给页面 markdown 里手写的内联 SVG 用（分类/标签页的窗口标题图标）：
   那里需要自己控制 viewBox 和 class，只借点阵库的「画」。
   参数同 xp_page_icon：空格分隔裸值，不要加引号。
   缺图案同样抛错 —— 构建期炸比上线空白强。 */
hexo.extend.tag.register('xp_pixel_rects', function (args) {
  const id = String((args && args[0]) || '');
  return pixOrThrow(id);
});
