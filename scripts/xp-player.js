/* global hexo */
'use strict';

/* ============================================================
   XP 播放器 —— 外观与行为（全局可拖动浮动条）
   ------------------------------------------------------------
   改动说明（2026-10-12 第二轮）：
     · 纵向布局：封面在上、歌名信息在下（之前是左右并排）
     · 可拖动：鼠标按住品牌条拖到任意位置，位置存 LocalStorage
     · 可隐藏：点 ✕ 彻底隐藏，右下角出现一个小圆形图标可恢复
     · 跳转按钮从 <button> 改成 <a> —— button 没有 href 属性

   平时要改的东西几乎都不在这个文件里，而在：
       source/_data/music.yml   —— 曲目 / 网易云歌单 id / 窗口标题 / 空状态文字
     只有想改播放器的「长相」或「行为」时，才需要动本文件。
   ============================================================ */

/* ⚠ 与 scripts/xp-content.js 里那份逐字相同，是有意保留的：Hexo 把每个
   scripts/*.js 分别包进独立 IIFE，两者作用域不共享，抽公共模块只能挂
   globalThis，反而更差。要改就两边一起改。 */
const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 播放器外观：纵向浮动条。
   · 封面在上居中（100×100 圆形缩略）
   · 歌名 + 歌手在下
   · 进度条 + 控制条在最底 */
function markup(title) {
  return `
<div class="xp-music-floating" id="xp-music-floating">
<div class="retro-mp4-player mp4-floating">
<div class="mp4-brand"><svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-note"/></svg> ${esc(title)} <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-note"/></svg></div>
<div class="mp4-screen">
<div class="mp4-screen-content mp4-screen-v">
<div class="mp4-cover"><div class="mp4-cover-placeholder" id="mp4-cover">
<svg width="28" height="28" viewBox="0 0 16 16" aria-hidden="true">
<use href="#icon-media-note"></use>
</svg>
</div></div>
<div class="mp4-song-info">
<div class="mp4-song-title-wrap"><span class="mp4-play-indicator" id="mp4-play-indicator"></span><span class="mp4-song-title" id="mp4-title"><span class="mp4-title-inner">未配置曲目</span></span></div>
<div class="mp4-song-author" id="mp4-author"></div>
</div>
</div>
</div>
<div class="mp4-progress-wrap">
<!-- 时间信息用 XP.css 的 .status-bar（分段凹陷格）—— 这是 XP 里显示状态信息的典型做法。
     两个 span 必须都带 .status-bar-field，否则只有外框、没有分段效果。 -->
<div class="mp4-progress-times status-bar">
<span class="status-bar-field" id="mp4-current">00:00</span>
<span class="status-bar-field" id="mp4-total">00:00</span>
</div>
<div class="mp4-progress-bar" id="mp4-progress-bar" role="progressbar" aria-label="播放进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
<div class="mp4-progress-fill" id="mp4-progress-fill"></div>
</div>
</div>
<div class="mp4-controls">
<button class="mp4-btn" id="mp4-prev" type="button" title="上一首" aria-label="上一首">
<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-prev"></use></svg>
</button>
<button class="mp4-btn mp4-btn-play" id="mp4-play" type="button" title="播放/暂停" aria-label="播放">
<svg id="icon-play" width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-play"></use></svg>
<svg id="icon-pause" width="1.15em" height="1.15em" viewBox="0 0 16 16" style="display:none" aria-hidden="true"><use href="#icon-media-pause"></use></svg>
</button>
<button class="mp4-btn" id="mp4-next" type="button" title="下一首" aria-label="下一首">
<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-next"></use></svg>
</button>
<button class="mp4-btn mp4-btn-mode" id="mp4-mode" type="button" title="随机播放（点击切换为顺序）" aria-label="随机播放（点击切换为顺序）" aria-pressed="true">
<svg class="mp4-mode-ico mp4-mode-random" width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-dice"></use></svg>
<svg class="mp4-mode-ico mp4-mode-list" width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-list"></use></svg>
</button>
<a class="mp4-btn mp4-btn-link" id="mp4-link" target="_blank" rel="noopener" title="跳转到网易云原页面" aria-label="跳转到网易云原页面">
<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-link"></use></svg>
</a>
<button class="mp4-btn mp4-btn-size" id="mp4-size" type="button" title="调节大小（小 / 标准 / 大）" aria-label="调节播放器大小">
<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-expand"></use></svg>
</button>
<button class="mp4-btn mp4-btn-close" id="mp4-close" type="button" title="折叠" aria-label="折叠">
<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-collapse"></use></svg>
</button>
<button class="mp4-btn mp4-btn-hide" id="mp4-hide" type="button" title="隐藏（点右下角小球恢复）" aria-label="隐藏播放器">
<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-eye"></use></svg>
</button>
</div>
</div>
</div>
<!-- 隐藏后的恢复小球（默认 display:none，JS 根据 LocalStorage 切换） -->
<button class="xp-music-resume" id="xp-music-resume" type="button" title="恢复音乐播放器" aria-label="恢复音乐播放器" style="display:none">
<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-media-note"></use></svg>
</button>
<div id="aplayer-hidden" style="display:none"></div>
`;
}

/* 播放器行为：纵向浮动条 + 拖动 + 隐藏 + LocalStorage + 歌名滚动 + 跳转原曲 */
const DRIVER = `
(function () {
  if (window.__XP_MUSIC_INITED__) return;
  window.__XP_MUSIC_INITED__ = true;

  if (window.XP_MUSIC_EMBED) return;

  var songs = window.XP_MUSIC || [];
  var S = 'xp_music_state_v1';        /* 主状态：index/progress/playing/order */
  var SP = S + '_p';                  /* 位置 */
  var SC = S + '_c';                  /* 折叠 */
  var SH = S + '_h';                  /* 隐藏 */
  var SS = S + '_s';                  /* 大小档位：0=小 1=标准 2=大 */
  /* ---- 顺序 / 随机播放（2026-10-21 改造，设计说明见 initPlayer 顶部） ---- */
  var mode = 'random';        /* random = 每轮重洗 · list = 按 yml 原始顺序 */
  var randKeys = [];          /* 随机档的排列（曲目键数组） */
  var origKeys = [];          /* yml 原始顺序（曲目键数组） */
  var failed = {};            /* 本次会话里加载失败的曲目键 —— 自动跳歌时跳过 */
  var lastKey = '';           /* 刚播完那首：重洗尾巴时避开，别让下一轮立刻重复 */
  var prevSwitch = -1;        /* 上次 listswitch 的下标，用来识别「一轮走完回到第 1 首」 */
  /* ★ 2026-10-17：每台设备的「收起/隐藏/位置/大小」分开存。
     以前 HTML 一出来就是展开态（markup 里没有 mp4-collapsed），要等这个脚本跑到
     末尾才把窄屏刷成收起 —— 网络慢、或者脚本被广告拦截时，手机上就一直是那个
     168px 的大窗口压着正文，甚至整块盖住最后一屏。现在给 #xp-music-floating
     写上 data-touch="1"，CSS 在手机上直接按收起态排版（先画对，脚本只是增强）。 */
  var mqTouch = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
  if (mqTouch && mqTouch.matches) {
    var box0 = document.getElementById('xp-music-floating');
    if (box0) box0.setAttribute('data-touch', '1');
    try {
      /* 从未手动设置过 → 直接算作"收起"，避免脚本第二遍再切一次 */
      if (localStorage.getItem(SC) === null) localStorage.setItem(SC, '1');
    } catch (e) {}
  }

  var $ = function (id) { return document.getElementById(id); };
  var index = 0, ap = null, isPlaying = false;

  function fmt(sec) {
    sec = Math.max(0, sec || 0);
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function load() { try { return JSON.parse(localStorage.getItem(S) || 'null'); } catch (e) { return null; } }

  /* 曲目唯一键：优先 url（网易外链里带唯一 id），没有 url 才退回 歌名||歌手。
     2026-10-21 之前顺序一律用 歌名||歌手 当键 —— 同名同歌手/纯音乐重名会撞键，
     恢复顺序时 map 覆盖就会丢曲目、下标全错位。 */
  function keyOf(o) {
    if (!o) return '';
    var u = o.url || '';
    if (u) return String(u);
    return String(o.title || o.name || '') + '||' + String(o.author || o.artist || '');
  }
  /* Fisher–Yates，原地打乱（每轮重洗都走这里，分布均匀） */
  function shuffleInPlace(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function save() {
    if (!ap) return;
    try {
      var audios = (ap.list && ap.list.audios) ? ap.list.audios : [];
      localStorage.setItem(S, JSON.stringify({
        v: 2,
        i: index,                                        /* 老版本读的下标，留着兜底 */
        cur: audios[index] ? keyOf(audios[index]) : '',   /* 当前曲目用「键」锚定 */
        p: ap.audio ? ap.audio.currentTime : 0,
        playing: isPlaying,
        mode: mode,
        order: audios.map(keyOf)                          /* 当前播放顺序（键数组） */
      }));
    } catch (e) {}
  }

  /* ---- 拖动 ----
     2026-10-13 两个手机端修复：
     · 把手从顶部窄条扩大到整个播放器（按钮/进度条除外）—— 手机屏幕最上缘是系统
       手势区（下拉通知/地址栏），只靠顶部窄条永远没法把播放器送到最上方；
     · 位置统一过 clampPos 钳制 —— 转屏 / 弹出输入法会让画面变小，之前恢复坐标时
       不检查边界，播放器就会停在画面外，只能清缓存救回来。 */
  var dragging = false, dragOffX = 0, dragOffY = 0;
  /* 排除区只留「真正要响应点击/滑动的控件」：按钮、链接、进度条。
     这里以前把 .mp4-progress-wrap（整行）也排除了，加上 7 个按钮占满控制条，
     结果全播放器**只剩歌名那一行能拖** —— 手机端表现就是「只有上部可以拖」。
     现在进度条只排除可点的那条 bar 本身，包裹层（含时间数字）可以拖。 */
  var GRIP_EXCLUDE = 'button, a, .xp-window-btn, .mp4-btn, .mp4-progress-bar';

  /* 视口尺寸：优先用 visualViewport —— 手机地址栏收起/弹出、软键盘顶起都只改它，
     不会触发 window 的 resize。以前只监听 resize，于是「地址栏收起后画面变矮」
     这类变化没人管，玩家又被留在画面外（这正是「偶发跑到画面外、只能刷新」的成因之一）。 */
  function viewportSize() {
    var vv = window.visualViewport;
    /* 任务栏高度：读 CSS 变量 --taskbar-height（没读到就按 36px）。
       播放器的"默认落点"要避开它，否则收起态会压住开始菜单那一行。 */
    var tb = 36;
    try {
      var raw = getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height');
      var n = parseFloat(raw);
      if (!isNaN(n) && n > 0) tb = n;
    } catch (e) {}
    return {
      w: Math.round(vv && vv.width ? vv.width : window.innerWidth),
      h: Math.round(vv && vv.height ? vv.height : window.innerHeight),
      taskbar: tb
    };
  }

  /* 元素在屏幕上的**真实占位**，一律以 getBoundingClientRect 为准。
     ⚠ 绝对不要用 offsetWidth/offsetHeight 再乘一个自己解析出来的 scale ——
     踩过的坑：offsetWidth 是不含 transform 的整数取整值，而
     getComputedStyle().transform 在切档过渡期间读到的是**动画中间值**，
     两者相乘得到的尺寸根本没意义（实测反推出 217px 这种既非 200 也非 250 的数），
     于是钳位边界算错、播放器被允许停到屏幕外，表现为「最大档溢出」「最小档贴不到边」。
     getBoundingClientRect 已经把 transform 算进去了，一个数就是答案。 */
  function visualRect(box) {
    var r = box.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top };
  }

  function clampPos(box) {
    var vp = viewportSize();
    var vr = visualRect(box);
    var x = parseInt(box.style.left, 10), y = parseInt(box.style.top, 10);
    if (isNaN(x) && isNaN(y)) {
      /* ★ 2026-10-17：没拖过的"默认右下角"位置以前完全不管，于是窄屏收起态
         （CSS 默认，宽 168px）照样压在正文/任务栏上，而右下角正是最挡正文的地方。
         这里给一个"桌面式"的默认落点：浮在任务栏上方的那块桌面区域（右侧），
         但**底边不进入右下角最后 90px**（那里留给任务栏托盘与正文最后一行）。 */
      var TAIL_RIGHT = 90;      /* 右下角留给任务栏托盘/滚动条的区域，不放东西 */
      var TAIL_BOTTOM = 8;
      x = vp.w - vr.w - TAIL_RIGHT;
      y = vp.h - vr.h - TAIL_BOTTOM - vp.taskbar;
      x = Math.round(Math.min(Math.max(x, 0), Math.max(0, vp.w - vr.w)));
      y = Math.round(Math.min(Math.max(y, 0), Math.max(0, vp.h - vr.h - vp.taskbar)));
      box.style.left = x + 'px'; box.style.top = y + 'px';
      box.style.right = 'auto'; box.style.bottom = 'auto';
      return;
    }

    /* 缩放原点是左上角 ⇒ left/top 就是屏幕上的左上角，直接钳即可。
       下限允许到 0：这样缩到最小时播放器能真正贴住屏幕边缘
       （以前下限写死 4，永远差一截贴不到边，就是「空气墙」的手感）。 */
    var maxX = Math.max(0, vp.w - vr.w);
    var maxY = Math.max(0, vp.h - vr.h);
    x = Math.round(Math.min(Math.max(isNaN(x) ? 0 : x, 0), maxX));
    y = Math.round(Math.min(Math.max(isNaN(y) ? 0 : y, 0), maxY));

    box.style.left = x + 'px'; box.style.top = y + 'px';
    box.style.right = 'auto'; box.style.bottom = 'auto';
    try { localStorage.setItem(SP, JSON.stringify({ l: x, t: y })); } catch (e) {}
  }
  function enableDrag() {
    var box = document.getElementById('xp-music-floating');
    if (!box) return;
    box.addEventListener('mousedown', function (e) {
      /* 按钮链接和进度条照常工作，其余区域都能拖动（用 closest 捕获 SVG 图标内的按下） */
      if (e.target && e.target.closest && e.target.closest(GRIP_EXCLUDE)) return;
      dragging = true;
      var rect = box.getBoundingClientRect();
      dragOffX = e.clientX - rect.left;
      dragOffY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      box.style.left = (e.clientX - dragOffX) + 'px';
      box.style.top = (e.clientY - dragOffY) + 'px';
      box.style.right = 'auto'; box.style.bottom = 'auto';
      clampPos(box);
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    /* 触屏也支持拖动 */
    box.addEventListener('touchstart', function (e) {
      if (e.target && e.target.closest && e.target.closest(GRIP_EXCLUDE)) return;
      var t = e.touches[0];
      var rect = box.getBoundingClientRect();
      dragOffX = t.clientX - rect.left; dragOffY = t.clientY - rect.top;
      dragging = true;
    }, { passive: true });    document.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      e.preventDefault();   /* 拖播放器期间阻止页面跟着滚（必须配 passive:false 才能调用） */
      var t = e.touches[0];
      box.style.left = (t.clientX - dragOffX) + 'px';
      box.style.top = (t.clientY - dragOffY) + 'px';
      box.style.right = 'auto'; box.style.bottom = 'auto';
      clampPos(box);
    }, { passive: false });
    document.addEventListener('touchend', function () { dragging = false; });
    /* 转屏 / 窗口大小变化后，把位置拉回画面内（横转竖最容易把坐标挤出屏幕） */
    window.addEventListener('resize', function () { clampPos(box); });
    /* 地址栏收起/弹出、软键盘顶起只会改 visualViewport，不触发 resize —— 必须单独听 */
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () { clampPos(box); });
      window.visualViewport.addEventListener('scroll', function () { clampPos(box); });
    }
    /* orientationchange 触发时视口往往还没稳定，量到的还是旧尺寸：
       多钳几次，覆盖「250ms 后仍在变」的情况（这就是偶发跑到画面外的元凶）。 */
    function reclamp() { clampPos(box); }
    window.addEventListener('orientationchange', function () {
      setTimeout(reclamp, 120);
      setTimeout(reclamp, 350);
      setTimeout(reclamp, 800);
    });
  }

  function restorePosition() {
    var box = document.getElementById('xp-music-floating');
    if (!box) return;
    try {
      var p = JSON.parse(localStorage.getItem(SP) || 'null');
      if (p && typeof p.l === 'number' && typeof p.t === 'number') {
        box.style.left = p.l + 'px'; box.style.top = p.t + 'px';
        box.style.right = 'auto'; box.style.bottom = 'auto';
        clampPos(box);   /* 存的坐标可能已经出界（转屏过/窗口变小过），钳回来 */
        /* 初始化这一刻封面图、字体、大小档位都还没落定，getBoundingClientRect 量到
           的高度偏小 → 钳位算出的边界偏松，玩家仍可能露在画面外。等布局稳定再钳几次。 */
        if (window.requestAnimationFrame) {
          requestAnimationFrame(function () { clampPos(box); });
        }
        setTimeout(function () { clampPos(box); }, 300);
        setTimeout(function () { clampPos(box); }, 1000);
      }
    } catch (e) {}
  }

  /* ---- 隐藏 / 恢复 ---- */
  function hidePlayer() {
    var box = document.getElementById('xp-music-floating');
    var dot = document.getElementById('xp-music-resume');
    if (box) box.classList.add('mp4-hidden');
    if (dot) dot.style.display = '';
    try { localStorage.setItem(SH, '1'); } catch (e) {}
  }
  function showPlayer() {
    var box = document.getElementById('xp-music-floating');
    var dot = document.getElementById('xp-music-resume');
    if (box) { box.classList.remove('mp4-hidden'); box.classList.remove('mp4-collapsed'); }
    if (dot) dot.style.display = 'none';
    try { localStorage.removeItem(SH); } catch (e) {}
  }
  function restoreHidden() {
    try { if (localStorage.getItem(SH) === '1') hidePlayer(); } catch (e) {}
  }

  /* ---- 大小调节（2026-10-13）：小 / 标准 / 大 三档循环，档位存 LocalStorage ----
     用整体 transform 缩放：不动内部布局，拖动、折叠、隐藏都照常工作。

     ⚠ 缩放原点必须是 **左上角**（top left），不能是右下角。
     原点若在右下角，left/top 就不再等于「屏幕上看到的左上角」：
       视觉左上角 = left + (1-s)×宽高  →  s=1.25 时比 left 小 50px，
       于是播放器在左上/右上/左下角调「大」会直接顶出屏幕；
       s=0.8 时又比 left 大 40px，钳位下限 4 使它**永远贴不到屏幕边缘**。
     固定在左上角后 left/top 与视觉位置一一对应，上面两个毛病一起消失，
     clampPos 也不用再做任何换算。 */
  /* 手机单列（≤900px）时整个播放器缩到 0.9 —— **与 CSS 里那条
     @media (max-width: 900px) .xp-music-floating { width: 200px } 必须成对改**
     （见 xp-custom.css 第 14 节附近的说明）。200 × 0.9 = 180px 视觉宽，
     2026-10-19 站主二次反馈「还是过小」，从 0.75/186 再上调（视觉宽 +29%）；
     390px 屏上占宽不到一半，不会盖正文。 */
  function autoScale() {
    var mq = window.matchMedia;
    return (mq && mq('(max-width: 900px)').matches) ? 0.75 : 1;
  }
  /* 手机上也只给两档：小(0.85) / 标准(1) —— 乘 autoScale 0.9 后即
     0.77 / 0.9，第三档会把展开态顶回 200px+，所以触屏单列时砍掉。
     桌面端仍是三档。档位存同一个 LocalStorage 键。 */
  /* ★ 2026-10-18 修 bug：这一行的 SCALE_STEPS 从来没有定义过（它只是注释里
     「小 / 标准 / 大 三档」的口头叫法），于是 autoScale()==1（桌面）时这里抛
     ReferenceError: SCALE_STEPS is not defined —— 整个播放器脚本从这一刻起
     全部停摆（折叠、换档、hide/show、拖动、键盘都是后面定义的）。
     现在直接把三档写在这里。 */
  var SCALE_STEPS = [0.8, 1, 1.25];
  function getScaleSteps() {
    return autoScale() < 1 ? [0.85, 1] : SCALE_STEPS;
  }
  function applyScale(step) {
    var el = document.getElementById('xp-music-floating');
    if (!el) return;
    var steps = getScaleSteps(), n = steps.length;
    var v = steps[((step % n) + n) % n];
    v = v * autoScale();
    el.style.transform = v === 1 ? '' : 'scale(' + v + ')';
    el.style.transformOrigin = 'top left';
    /* 换档会改变实际占用尺寸，且 transform 有过渡：过渡一结束就重新钳位，
       否则「贴在右下角时调大」会把播放器推出画面。 */
    if (typeof clampPos === 'function') {
      setTimeout(function () { clampPos(el); }, 260);
    }
  }
  function restoreSize() {
    var s = -1;
    try { s = parseInt(localStorage.getItem(SS), 10); } catch (e) {}
    if (s >= 0 && s < getScaleSteps().length) applyScale(s);
  }
  /* 跨过 900px 时 autoScale() 变了：按当前档位重算一次。
     applyScale 只吃档位，所以这里从 LocalStorage 取回来再调。 */
  window.addEventListener('resize', function () {
    var s = 1;
    try { s = parseInt(localStorage.getItem(SS), 10); } catch (e) {}
    applyScale(isNaN(s) ? 1 : s);
  });

  /* ---- 歌名/歌手跑马灯 ----
     标题和歌手都包 .mp4-title-inner 结构，超宽各自滚动（2026-10-19 站主要求
     「歌名/歌手专辑名过长则滚动播放」——以前只有标题滚，歌手是硬截断）。
     2026-10-19 二版：改用开源通行的「双份内容无缝循环」方案
     （参考 Ryan Mulligan《The Infinite Marquee》/ Delcano seamless marquee）：
     JS 把文本写两份进 inner，CSS 让整条 track 位移 -50%，首尾无空档。
     以前单份 + padding-left:100% 的写法每轮都有大段空白，且复位时跳变。 */
  function marquee() {
    /* 2026-10-20 重写（二版）：以前量 inner 自身 scrollWidth/clientWidth 或
       inner 父级（.mp4-song-title），但后者是 flex:0 1 auto —— 宽度由内容
       决定，短文本时 clientWidth ≈ 文本宽，加上 28px 常数后「永远超宽」，
       全变滚动（截图复现）。现在量「单份文本自然宽 vs 歌名条带
       .mp4-song-info 的可用内宽」（布局定宽，与内容无关）判断是否滚动。
       2026-10-20 三版（站主要求）：暂停时一律不滚动 —— 停下来让访客
       看清完整歌名，播放时才滚动（市面上多数播放器同款行为）。 */
    var inners = document.querySelectorAll('.mp4-title-inner');
    for (var k = 0; k < inners.length; k++) {
      var inner = inners[k];
      var copy = inner.querySelector('.mp4-marquee-copy');
      if (!copy) continue;
      inner.classList.remove('mp4-marquee');
      if (!isPlaying) continue;              /* 暂停 → 永不滚动 */
      /* 参照宽：向上找 .mp4-song-info；找不到（异常结构）退回父级。
         display:none 的副本（如收起/隐藏容器里）clientWidth=0，会恒判超宽
         —— 跳过不可见容器。 */
      var ref = inner.closest ? inner.closest('.mp4-song-info') : null;
      if (!ref) ref = inner.parentElement;
      if (!ref || ref.clientWidth < 10) continue;
      var cs = window.getComputedStyle ? getComputedStyle(ref) : null;
      var avail = ref.clientWidth - (cs ? (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) : 0);
      /* 先删掉可能残留的第二份，量「单份」的真实宽度 */
      var copies = inner.querySelectorAll('.mp4-marquee-copy');
      for (var c = copies.length - 1; c >= 1; c--) copies[c].remove();
      void inner.offsetWidth;
      var need = copy.offsetWidth > avail + 2;
      if (need) {
        inner.appendChild(copy.cloneNode(true));
        inner.classList.add('mp4-marquee');
      }
    }
  }
  /* 把文本写进 inner（单份）。是否补第二份滚动，统一交给 marquee() 量宽决定 ——
     量宽时机在 setTimeout(marquee,0) 里，布局已稳定，判断才可靠。 */
  function setMarqueeText(inner, text) {
    if (!inner) return;
    inner.textContent = '';
    var t1 = document.createElement('span');
    t1.className = 'mp4-marquee-copy';
    t1.textContent = text;
    inner.appendChild(t1);
  }

  function renderEmpty() {
    var inners = document.querySelectorAll('.mp4-title-inner');
    for (var k = 0; k < inners.length; k++) {
      setMarqueeText(inners[k], (window.XP_MUSIC_UI || {}).empty || '未配置曲目');
    }
    ['mp4-play','mp4-prev','mp4-next'].forEach(function (id) {
      var b = $(id); if (b) { b.disabled = true; b.setAttribute('aria-disabled','true'); }
    });
    var link = $('mp4-link'); if (link) link.style.display = 'none';
    var bar = $('mp4-progress-bar');
    if (bar) { bar.style.cursor = 'default'; bar.removeAttribute('role'); }
    var screen = document.querySelector('.mp4-screen');
    if (screen) screen.classList.add('is-empty');
  }

  function neUrl(s) {
    if (!s || !s.url) return '';
    /* ⚠ DRIVER 是模板字符串：正则里的反斜杠必须写双份（\\d），
       写单份会被模板字面量吃掉变成 d —— 2026-10-12 修复：该链接因此从未显示过 */
    var m = String(s.url).match(/[?&]id=(\\d+)/);
    return m ? 'https://music.163.com/#/song?id=' + m[1] : '';
  }

  /* 封面图白名单（2026-10-12 审查加固）：
     song.pic 来自「网络抓取 → music-tracks.yml → 内联脚本」三级，直接拼进
     url("...") 等于给 CSS 注入留了口子（典型利用：加载外部资源做追踪 / 钓鱼背景）。
     只放行两类：
       1. 网易云封面 CDN：https://p1..p4.music.126.net/<base64 id>/<数字 id>.jpg
          （注意是两段路径，第一段含 = 号——实测漏掉中间那段会把真封面也挡掉）
       2. 站内相对路径（手填 music.yml 时可以用 /images/... 本地封面）
     其它一律当没有封面处理（回退到占位 SVG），neUrl() 的同款思路。 */
  var PIC_CDN_RE = /^https:\\/\\/p[1-4]\\.music\\.126\\.net\\/[A-Za-z0-9_\\-=]+\\/\\d+\\.[A-Za-z]{3,4}$/;
  function safePic(p) {
    if (!p) return '';
    p = String(p).trim();
    if (PIC_CDN_RE.test(p)) return p;
    if (p.charAt(0) === '/' && !/:|\\/\\/|\\.\\./.test(p)) return p;
    return '';
  }

  function updateSongInfo(i) {
    var song = songs[i]; if (!song) return;
    /* 标题 inner 是 markup 里自带的第一个；歌手 inner 在 L431 动态重建。
       都用「先清 marquee → 写文本 → 量宽 → 必要时再滚」的统一路径。 */
    var inner = document.querySelector('.mp4-song-title .mp4-title-inner');
    if (inner) setMarqueeText(inner, song.title || '');
    if ($('mp4-author')) {
      /* 歌手行与标题同构：外层 .mp4-song-author 截宽，内层 inner 双份跑马灯 */
      $('mp4-author').innerHTML = '<span class="mp4-title-inner"></span>';
      setMarqueeText($('mp4-author').firstChild, song.author || '');
    }
    var link = $('mp4-link');
    if (link) {
      var t = neUrl(song);
      if (t) { link.href = t; link.style.display = ''; }
      else { link.style.display = 'none'; }
    }
    var cover = $('mp4-cover');
    if (cover) {
      var ph = cover.querySelector('svg');
      var pic = safePic(song.pic);
      if (pic) {
        cover.style.backgroundImage = 'url("' + pic + '")';
        cover.style.backgroundSize = 'cover';
        cover.style.backgroundPosition = 'center';
        cover.classList.add('has-cover');
        if (ph) ph.style.display = 'none';
      } else {
        cover.style.backgroundImage = '';
        cover.classList.remove('has-cover');
        if (ph) ph.style.display = '';
      }
    }
    setTimeout(marquee, 0);
  }

  function setPlaying(playing) {
    isPlaying = playing;
    var p = $('icon-play'), pu = $('icon-pause'), dot = $('mp4-play-indicator');
    if (p) p.style.display = playing ? 'none' : '';
    if (pu) pu.style.display = playing ? '' : 'none';
    if (dot) dot.style.display = '';   /* 2026-10-20：绿点常驻（播放常亮/暂停闪烁由 CSS is-playing 控制） */
    var btn = $('mp4-play'); if (btn) btn.setAttribute('aria-label', playing ? '暂停' : '播放');
    /* 呼吸辉光挂钩：播放态给容器加 is-playing，封面随之脉动（CSS 精修层）。
       浮动条挂在 #xp-music-floating 上；首页 bento 格里的播放器没有这层
       包裹，直接挂在最近的 .retro-mp4-player 上 —— 两处都照顾到。 */
    var fl = document.getElementById('xp-music-floating');
    if (fl) fl.classList.toggle('is-playing', !!playing);
    /* 2026-10-21：两处都挂 —— 外层的 #xp-music-floating 给浮动条用，
       内层 .retro-mp4-player 给 bento 格用。以前「有外层就不挂内层」，
       结果浮动条里 .retro-mp4-player:not(.is-playing) 恒成立，绿点一直在闪。 */
    var box2 = btn && btn.closest ? btn.closest('.retro-mp4-player') : null;
    if (box2) box2.classList.toggle('is-playing', !!playing);
  }

  function initPlayer() {
    if (!songs.length || typeof APlayer === 'undefined') { renderEmpty(); return; }

    songs = songs.slice();
    var st = load() || {};
    var savedIndex = 0, savedProg = 0, shouldPlay = false;

    /* ---------- 播放顺序（2026-10-21 重做） ----------
       旧版：进站 Fisher–Yates 洗一次，把排列连同「绝对下标」塞进 localStorage，
       之后 next/prev 只是 ±1。于是 ——
         · 每轮播完回到第 1 首，永远同一个顺序（听着像固定歌单）；
         · 歌单增删一首就整张重洗，旧下标还套到新排列上，直接跳到不相干的歌；
         · 顺序用 歌名||歌手 当键，重名会覆盖丢曲目。
       现在：
         1. 键统一用 url（见 keyOf），旧版的 歌名||歌手 键会翻译过来，顺序不丢；
         2. 当前曲目按「键」锚定，歌单增删后仍停在同一首，新歌随机插进队列；
         3. 每轮播完（回到第 1 首）重洗剩下的尾巴，下一轮顺序必定不同（reshuffleTail）；
         4. 支持 随机 / 顺序 两档（顺序档走 yml 原始顺序 origKeys）。 */
    var bySong = {}, keySet = {};
    songs.forEach(function (s) { var k = keyOf(s); bySong[k] = s; keySet[k] = true; });
    origKeys = songs.map(keyOf);

    /* ① 读存档顺序；旧版（v1）的 歌名||歌手 键先翻译成 url 键 */
    var order = null;
    if (Array.isArray(st.order) && st.order.length) {
      order = st.order.slice();
      if (!order.every(function (k) { return keySet[k]; })) {
        var alias = {};
        songs.forEach(function (s) { alias[keyOf({ title: s.title, author: s.author })] = keyOf(s); });
        var tr = order.map(function (k) { return alias[k] || ''; });
        order = tr.every(Boolean) ? tr : null;      /* 翻译不全就整份作废，别拼出半张表 */
      }
    }
    /* ② 歌单有增删时保留旧相对顺序，新歌随机插进队列（不再整张重洗） */
    if (order) {
      var seen = {}, keep = [];
      order.forEach(function (k) { if (keySet[k] && !seen[k]) { seen[k] = true; keep.push(k); } });
      var added = origKeys.filter(function (k) { return !seen[k]; });
      while (added.length) keep.splice(Math.floor(Math.random() * (keep.length + 1)), 0, added.pop());
      order = keep;
    } else {
      order = shuffleInPlace(origKeys.slice());
    }
    randKeys = order.slice();
    mode = st.mode === 'list' ? 'list' : 'random';

    /* ③ 停在哪一首：v2 用 cur 键锚定；旧版用下标 + 翻译后的顺序兜底 */
    var curKey = (st.cur && keySet[st.cur]) ? st.cur : '';
    if (!curKey && typeof st.i === 'number' && order[st.i]) curKey = order[st.i];
    if (!curKey) curKey = order[0];
    if (typeof st.p === 'number') savedProg = st.p;
    shouldPlay = !!st.playing;

    /* ④ 按当前档位排好 songs（= APlayer 的 audios 顺序），下标对回 curKey */
    var seq = (mode === 'list') ? origKeys.slice() : randKeys.slice();
    songs = seq.map(function (k) { return bySong[k]; }).filter(Boolean);
    savedIndex = Math.max(0, seq.indexOf(curKey));

    ap = new APlayer({
      container: $('aplayer-hidden'),
      audio: songs.map(function (s) {
        return { name: s.title, artist: s.author, url: s.url, cover: s.pic || '' };
      }),
      volume: 0.7
    });
    index = savedIndex;
    if (index > 0) ap.switchAudio(index);
    /* 初始化这次切歌发生在下面的 listswitch 监听注册之前，它不会回填 prevSwitch；
       手动补上基线，否则「一进来就停在第 44 首、再点下一首」的头一次回绕认不出来。 */
    prevSwitch = index;
    updateSongInfo(index);

    ap.on('loadeddata', function () {
      if (savedProg > 0 && ap.audio && ap.audio.duration) {
        ap.seek(Math.min(savedProg, ap.audio.duration - 0.5));
      }
      if (shouldPlay) { ap.play(); }
      savedProg = 0; shouldPlay = false;
    });
    ap.on('listswitch', function (info) {
      if (!info || typeof info.index !== 'number') return;
      /* 「一轮走完」= 从最后一首切回第 1 首（prevSwitch 是上一首下标）。
         以前用 prevSwitch>0 判定，结果从第 2 首按「上一首」回到第 1 首也会
         触发重洗 —— 现在只认「末尾→开头」这唯一的前向跨越。 */
      var wrapped = (info.index === 0 && prevSwitch === ap.list.audios.length - 1);
      index = info.index;
      updateSongInfo(index); save();
      if (wrapped) {
        var audios = ap.list.audios;
        lastKey = audios.length ? keyOf(audios[audios.length - 1]) : '';
        if (mode === 'random') reshuffleTail();
      }
      prevSwitch = index;
    });
    /* errC 统计「连续」加载失败次数，用来防止整张歌单都失效时无限跳歌。
       必须在成功播放时清零：否则一次会话里累计失败到 songs.length 次之后，
       自动跳歌就永久失效了（哪怕后面大多能正常播）。
       2026-10-21：失败的曲目键记进 failed，跳歌时优先跳过它们 ——
       以前坏链多的时候每次都跳固定邻居，反复撞同一堵墙。 */
    var errC = 0;
    ap.on('error', function () {
      var bad = ap.list.audios[index] ? keyOf(ap.list.audios[index]) : '';
      if (bad) failed[bad] = true;
      errC += 1;
      if (errC >= songs.length) return;   /* 整张都不行：别无限跳 */
      ap.switchAudio(nextIndex());
      if (isPlaying) ap.play();
    });

    var last = 0;
    ap.on('timeupdate', function () {
      var c = ap.audio.currentTime || 0, t = ap.audio.duration || 0;
      if ($('mp4-current')) $('mp4-current').textContent = fmt(c);
      if ($('mp4-total')) $('mp4-total').textContent = fmt(t);
      if (t > 0) {
        var pct = (c / t) * 100;
        var f = $('mp4-progress-fill'); if (f) f.style.width = pct + '%';
        var b = $('mp4-progress-bar'); if (b) b.setAttribute('aria-valuenow', String(Math.round(pct)));
      }
      var now = Date.now();
      if (now - last > 2000) { save(); last = now; }
    });
    /* 2026-10-21：删掉旧的 ap.on('ended', next())。APlayer 内部 loop:'all'
       自己就会 skipForward + play，再挂一个 next() 等于每首播完连跳两首。 */
    ap.on('play', function () {
      isPlaying = true; setPlaying(true); errC = 0; save(); setTimeout(marquee, 0);
      var ok = ap.list.audios[index] ? keyOf(ap.list.audios[index]) : '';
      if (ok) delete failed[ok];        /* 这次放出来了：解除失败标记 */
    });
    ap.on('pause', function () { isPlaying = false; setPlaying(false); save(); marquee(); });

    /* 按钮绑定 */
    if ($('mp4-play')) $('mp4-play').addEventListener('click', toggle);
    if ($('mp4-prev')) $('mp4-prev').addEventListener('click', prev);
    if ($('mp4-next')) $('mp4-next').addEventListener('click', next);
    var close = $('mp4-close');
    if (close) close.addEventListener('click', function () {
      var box = document.getElementById('xp-music-floating');
      if (box) {
        box.classList.toggle('mp4-collapsed');
        /* 用户自己点过 ▢/✕（含在手机上展开）→ 撤掉 CSS 的默认收起，以用户为准 */
        box.setAttribute('data-xp-user-open', box.classList.contains('mp4-collapsed') ? '0' : '1');
        try { localStorage.setItem(SC, box.classList.contains('mp4-collapsed') ? '1' : '0'); } catch (e) {}
      }
    });
    var hide = $('mp4-hide');
    if (hide) hide.addEventListener('click', hidePlayer);
    var resume = $('xp-music-resume');
    if (resume) resume.addEventListener('click', showPlayer);
    var sizeBtn = $('mp4-size');
    if (sizeBtn) sizeBtn.addEventListener('click', function () {
      var cur = 0;
      try { cur = parseInt(localStorage.getItem(SS), 10) || 0; } catch (e) {}
      cur = (cur + 1) % getScaleSteps().length;
      try { localStorage.setItem(SS, String(cur)); } catch (e) {}
      applyScale(cur);
    });
    var modeBtn = $('mp4-mode');
    if (modeBtn) modeBtn.addEventListener('click', toggleMode);
    paintMode();

    var bar = $('mp4-progress-bar');
    if (bar) bar.addEventListener('click', function (e) {
      if (!ap || !ap.audio.duration) return;
      var r = bar.getBoundingClientRect();
      ap.seek(((e.clientX - r.left) / r.width) * ap.audio.duration);
    });

    /* 恢复持久化状态 */
    try {
      var box = document.getElementById('xp-music-floating');
      var saved = localStorage.getItem(SC);
      /* ★ 2026-10-17：断点从 640 放到 900 —— 900 以下首页是单列，任何固定宽度的
         浮动窗口都只能压在正文上。900 以上仍是桌面并排布局，展开态有地方放。
         首次访问（从未手动设置过）时默认收起成一条，想看完整播放器点 ▢ 展开。 */
      var isHandheld = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
      if (saved === '1') {
        if (box) box.classList.add('mp4-collapsed');
      } else if (saved === null && box && isHandheld) {
        box.classList.add('mp4-collapsed');
      }
    } catch (e) {}

    restorePosition();
    restoreHidden();
    restoreSize();
    enableDrag();
  }

  function toggle() { if (!ap) return; isPlaying ? ap.pause() : ap.play(); }

  /* 下一个不在「本次会话已失败」集合里的下标；全失败过就退回顺序 +1 */
  function nextIndex() {
    var n = ap && ap.list ? ap.list.audios.length : 0;
    if (!n) return 0;
    for (var step = 1; step <= n; step++) {
      var j = (index + step) % n;
      if (!failed[keyOf(ap.list.audios[j])]) return j;
    }
    return (index + 1) % n;
  }
  function gotoIndex(i) {
    if (!ap || !ap.list || !ap.list.audios.length) return;
    ap.switchAudio(i);          /* switch 会触发 listswitch → 更新界面 + 存档 */
    updateSongInfo(i);
    if (isPlaying) ap.play();
  }
  function prev() {
    if (!ap || !ap.list || !ap.list.audios.length) return;
    gotoIndex((index - 1 + ap.list.audios.length) % ap.list.audios.length);
  }
  function next() { if (!ap) return; gotoIndex(nextIndex()); }

  /* 把 APlayer 列表重排成 keysArr 指定的顺序（原地 splice，不换 audio 对象，
     所以正在播的那首不会被打断），并把全局下标对回 keepKey 那首。 */
  function applyOrder(keysArr, keepKey) {
    if (!ap || !ap.list || !keysArr || !keysArr.length) return;
    var byKey = {};
    ap.list.audios.forEach(function (a) { byKey[keyOf(a)] = a; });
    var out = [], k = -1;
    keysArr.forEach(function (key) {
      var a = byKey[key];
      if (a) { out.push(a); if (keepKey && keyOf(a) === keepKey) k = out.length - 1; }
    });
    if (out.length !== ap.list.audios.length) return;   /* 有键对不上：保持原样最安全 */
    Array.prototype.splice.apply(ap.list.audios, [0, ap.list.audios.length].concat(out));
    /* 同步一份「与 audios 同序」的 songs：updateSongInfo/neUrl 都按下标读它 */
    songs = ap.list.audios.map(function (a) {
      return { title: a.name, author: a.artist, url: a.url, pic: a.cover };
    });
    ap.list.audios.forEach(function (a, i) { if (keepKey && keyOf(a) === keepKey) k = i; });
    if (k >= 0) { ap.list.index = k; index = k; }
    save();
  }

  /* 一轮播完：保留正在放的第 1 首，其余全部重洗，下一轮顺序必定不同；
     并避开「刚播完那首」占据第 2 位，免得下一轮立刻重复。 */
  function reshuffleTail() {
    if (!ap || !ap.list || ap.list.audios.length < 2) return;
    var headKey = keyOf(ap.list.audios[0]);
    var tail = shuffleInPlace(ap.list.audios.slice(1).map(keyOf));
    if (lastKey && tail.length > 1 && tail[0] === lastKey) {
      var t = tail[0]; tail[0] = tail[1]; tail[1] = t;
    }
    randKeys = [headKey].concat(tail);
    applyOrder(randKeys, headKey);
  }

  /* 随机 / 顺序 两档：切换时把列表重排到对应顺序，正在播的那首不中断。 */
  function paintMode() {
    var b = $('mp4-mode'); if (!b) return;
    var random = mode !== 'list';
    b.classList.toggle('is-sequential', !random);
    b.setAttribute('aria-pressed', random ? 'true' : 'false');
    var t = random ? '随机播放（点击切换为顺序）' : '顺序播放（点击切换为随机）';
    b.title = t;
    b.setAttribute('aria-label', t);
  }
  function setMode(m) {
    mode = (m === 'list') ? 'list' : 'random';
    if (ap && ap.list && ap.list.audios.length) {
      var curKey = keyOf(ap.list.audios[index]);
      applyOrder((mode === 'list' ? origKeys : randKeys).slice(), curKey);
    }
    paintMode();
    save();
  }
  function toggleMode() { setMode(mode === 'list' ? 'random' : 'list'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPlayer);
  else initPlayer();
})();
`;

module.exports = { markup, driver: DRIVER };
