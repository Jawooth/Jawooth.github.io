
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
  var PAGE_ICONS = {"/":"<g transform=\"scale(0.3333333333333333)\"><g fill=\"none\" stroke-width=\"4\"><path fill=\"#ef5b52\" stroke=\"#6b7480\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M9 18V42H39V18L24 6L9 18Z\"/><path fill=\"#4a86e8\" stroke=\"#fff\" stroke-linejoin=\"round\" d=\"M19 29V42H29V29H19Z\"/><path stroke=\"#6b7480\" stroke-linecap=\"round\" d=\"M9 42H39\"/></g></g>","/works/":"<g transform=\"scale(0.3333333333333333)\"><g fill=\"#ffffff\" stroke=\"#6b7480\" stroke-width=\"4\" stroke-linejoin=\"round\"><path d=\"M24 5C11.85 5 2 13.954 2 25C2 36.046 11.85 45 24 45C27.314 45 30 42.314 30 39C30 37.4 29.37 35.94 28.34 34.87C27.34 33.83 26.72 32.48 26.72 31C26.72 27.69 29.4 25 32.72 25H37C40.87 25 44 21.87 44 18C44 10.82 34.15 5 24 5Z\"/></g><circle cx=\"13\" cy=\"17\" r=\"3.2\" fill=\"#ef5b52\"/><circle cx=\"24\" cy=\"13\" r=\"3.2\" fill=\"#ffd24a\"/><circle cx=\"35\" cy=\"17\" r=\"3.2\" fill=\"#55b463\"/><circle cx=\"11\" cy=\"28\" r=\"3.2\" fill=\"#4a86e8\"/><circle cx=\"19\" cy=\"34\" r=\"3.2\" fill=\"#f79240\"/></g>","/blog/":"<g transform=\"scale(0.3333333333333333)\"><g fill=\"none\" stroke-linejoin=\"round\" stroke-width=\"4\"><path fill=\"#f79240\" stroke=\"#6b7480\" d=\"M8 6C8 4.89543 8.89543 4 10 4H30L40 14V42C40 43.1046 39.1046 44 38 44H10C8.89543 44 8 43.1046 8 42V6Z\"/><path stroke=\"#fff\" stroke-linecap=\"round\" d=\"M16 20H32\"/><path stroke=\"#fff\" stroke-linecap=\"round\" d=\"M16 28H32\"/></g></g>","/games/":"<g transform=\"scale(0.3333333333333333)\"><g fill=\"none\" stroke-linejoin=\"round\" stroke-width=\"4\"><path fill=\"#9fd8f8\" stroke=\"#6b7480\" d=\"M32 18H16C9.37258 18 4 23.3726 4 30C4 36.6274 9.37258 42 16 42H32C38.6274 42 44 36.6274 44 30C44 23.3726 38.6274 18 32 18Z\"/><path stroke=\"#6b7480\" stroke-linecap=\"round\" d=\"M16 26V34\"/><path stroke=\"#6b7480\" stroke-linecap=\"round\" d=\"M12 30H20\"/><path stroke=\"#6b7480\" stroke-linecap=\"round\" d=\"M24 16V9.71429H32V4\"/><path fill=\"#6b7480\" stroke=\"#6b7480\" d=\"M32 34C34.2091 34 36 32.2091 36 30C36 27.7909 34.2091 26 32 26C29.7909 26 28 27.7909 28 30C28 32.2091 29.7909 34 32 34Z\"/></g></g>","/tools/":"<g transform=\"scale(0.3333333333333333)\"><g stroke=\"#6b7480\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path fill=\"#dde3ec\" d=\"M12.2 43.2C10.6 44.8 8 44.8 6.4 43.2L4.8 41.6C3.2 40 3.2 37.4 4.8 35.8L19.4 21.2C18.5 18.6 18.7 15.6 20 13.1C22 9.2 26.3 6.9 30.7 7.5C32.4 7.7 33.9 8.3 35.2 9.2L29.3 15.1C28.5 15.9 28.5 17.2 29.3 18L30 18.7C30.8 19.5 32.1 19.5 32.9 18.7L38.8 12.8C39.7 14.1 40.3 15.6 40.5 17.3C41.1 21.7 38.8 26 34.9 28C32.4 29.3 29.4 29.5 26.8 28.6Z\"/></g></g>","/guides/":"<g transform=\"scale(0.3333333333333333)\"><g fill=\"#f79240\" stroke=\"#6b7480\" stroke-linejoin=\"round\" stroke-width=\"4\"><path d=\"M5 7H16C20.4183 7 24 10.5817 24 15V42C24 38.6863 21.3137 36 18 36H5V7Z\" fill=\"#f79240\"><path d=\"M43 7H32C27.5817 7 24 10.5817 24 15V42C24 38.6863 26.6863 36 30 36H43V7Z\" fill=\"#f79240\"></g></g>","/archives/":"<g transform=\"scale(0.3333333333333333)\"><g fill=\"none\" stroke-linejoin=\"round\" stroke-width=\"4\"><rect width=\"36\" height=\"30\" x=\"6\" y=\"12\" fill=\"#55b463\" stroke=\"#6b7480\" rx=\"2\"/><path stroke=\"#fff\" stroke-linecap=\"round\" d=\"M17.9497 24.0083L29.9497 24.0083\"/><path stroke=\"#6b7480\" stroke-linecap=\"round\" d=\"M6 13L13 5H35L42 13\"/></g></g>","/thanks/":"<g transform=\"scale(0.3333333333333333)\"><path fill=\"#ef5b52\" stroke=\"#6b7480\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"4\" d=\"M15 8C8.92487 8 4 12.9249 4 19C4 30 17 40 24 42.3262C31 40 44 30 44 19C44 12.9249 39.0751 8 33 8C29.2797 8 25.9907 9.8469 24 12.6738C22.0093 9.8469 18.7203 8 15 8Z\"/></g>"};
  var PAGE_ICON_FALLBACK = "<g transform=\"scale(0.3333333333333333)\"><g fill=\"none\"><path fill=\"#6b7480\" stroke=\"#6b7480\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"4\" d=\"M10 44H38C39.1046 44 40 43.1046 40 42V14H30V4H10C8.89543 4 8 4.89543 8 6V42C8 43.1046 8.89543 44 10 44Z\"/><path stroke=\"#6b7480\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"4\" d=\"M30 4L40 14\"/><path stroke=\"#fff\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"4\" d=\"M24 31V28C26.2091 28 28 25.9853 28 23.5C28 21.0147 26.2091 19 24 19C21.7909 19 20 21.0147 20 23.5\"/><path fill=\"#fff\" fill-rule=\"evenodd\" d=\"M24 39C25.3807 39 26.5 37.8807 26.5 36.5C26.5 35.1193 25.3807 34 24 34C22.6193 34 21.5 35.1193 21.5 36.5C21.5 37.8807 22.6193 39 24 39Z\" clip-rule=\"evenodd\"/></g></g>";
  /* 同一张表挂到 window 上：页面里临时要插个图标（错误提示之类）可以取这里。
     首页「快速导航」瓦片不靠它 —— 那些是在构建期由 xp_page_icon 标签直接渲染好的。 */
  try { window.hexo_page_icons = PAGE_ICONS; } catch (e) {}
  function setCurrentPage() {
    var path = window.location.pathname.replace(/index\.html$/, '');
    /* 任务栏左下角那个「当前页面名」也读导航配置（由构建期注入 PAGE_TITLES），
       免得导航改名后这里还显示旧名字（2026-10-14 同一个坑踩了两次）。 */
    var pages = {"/":"首页","/works/":"绘画","/blog/":"文字","/games/":"游戏","/archives/":"归档","/tags/":"标签","/categories/":"分类","/thanks/":"致谢"};
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
  var SOUND_ON = true;   /* _config.yml 的 shutdown.sound（构建期注入） */
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

    var T = {"sound":true,"button":"关机","errorTitle":"Warning","errorLines":["关闭计算机时发生严重错误。","系统即将停止响应，未保存的内容将会丢失。"],"errorOk":"确定","bsHead":"我的小站 遇到问题需要关闭","bsLines":["一个问题已经发生，Windows 需要重新启动。我们只收集某些错误信息，然后为你重新启动。"],"bsProgressSuffix":"完成","bsCode":"停止代码：KFC_CRAZY_FRIDAY_VME50","bsFoot":"点击任意位置重启"};
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
    var T = {"sound":true,"button":"关机","errorTitle":"Warning","errorLines":["关闭计算机时发生严重错误。","系统即将停止响应，未保存的内容将会丢失。"],"errorOk":"确定","bsHead":"我的小站 遇到问题需要关闭","bsLines":["一个问题已经发生，Windows 需要重新启动。我们只收集某些错误信息，然后为你重新启动。"],"bsProgressSuffix":"完成","bsCode":"停止代码：KFC_CRAZY_FRIDAY_VME50","bsFoot":"点击任意位置重启"};
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
