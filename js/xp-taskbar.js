
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
        timeEl.textContent = pad(now.getHours()) + '：' + pad(now.getMinutes());
      } else {
        var h = now.getHours() % 12; if (h === 0) h = 12;
        timeEl.textContent = h + '：' + pad(now.getMinutes()) + (now.getHours() < 12 ? 'am' : 'pm');
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
  var PAGE_ICONS = {"/":"<path d=\"M8 1L1 7v8h5v-5h4v5h5V7L8 1z\" fill=\"#cc6633\" stroke=\"#993300\" stroke-width=\"0.5\"/><rect x=\"6\" y=\"10\" width=\"4\" height=\"5\" fill=\"#663300\" stroke=\"#330000\" stroke-width=\"0.5\"/>","/works/":"<path d=\"M8 1C4 1 1 4 1 8s3 7 7 7c1 0 2-1 2-2s-1-1-1-2 1-2 2-2 2 1 2 2 1 2 2 2 2-1 2-2c0-3-3-7-7-7z\" fill=\"#ff9999\" stroke=\"#cc6666\" stroke-width=\"0.5\"/><circle cx=\"5\" cy=\"6\" r=\"1.2\" fill=\"#ff6666\"/><circle cx=\"11\" cy=\"6\" r=\"1.2\" fill=\"#66cc66\"/><circle cx=\"5\" cy=\"10\" r=\"1.2\" fill=\"#6666ff\"/><circle cx=\"10\" cy=\"11\" r=\"1.2\" fill=\"#ffff66\"/>","/blog/":"<rect x=\"3\" y=\"1.5\" width=\"10\" height=\"13\" rx=\"1\" fill=\"#fdfdf8\" stroke=\"#336699\" stroke-width=\"0.8\"/><rect x=\"3\" y=\"1.5\" width=\"10\" height=\"3\" fill=\"#3366cc\"/><line x1=\"5\" y1=\"7\" x2=\"11\" y2=\"7\" stroke=\"#88aacc\" stroke-width=\"0.9\"/><line x1=\"5\" y1=\"9.3\" x2=\"11\" y2=\"9.3\" stroke=\"#88aacc\" stroke-width=\"0.9\"/><line x1=\"5\" y1=\"11.6\" x2=\"9\" y2=\"11.6\" stroke=\"#88aacc\" stroke-width=\"0.9\"/>","/games/":"<rect x=\"2\" y=\"4\" width=\"12\" height=\"8\" rx=\"3\" fill=\"#333333\" stroke=\"#000000\" stroke-width=\"0.5\"/><circle cx=\"5\" cy=\"8\" r=\"1.5\" fill=\"#666666\"/><circle cx=\"11\" cy=\"7\" r=\"1\" fill=\"#ff3333\"/><circle cx=\"12\" cy=\"9\" r=\"1\" fill=\"#3333ff\"/>","/tools/":"<path d=\"M13.2 3.4l-2.6 2.6 -1.8-1.8 2.6-2.6c-1.5-0.6-3.3-0.3-4.5 0.9 -1.2 1.2-1.5 3-0.9 4.5l-4.9 4.9 2.2 2.2 4.9-4.9c1.5 0.6 3.3 0.3 4.5-0.9 1.2-1.2 1.5-3 0.5-4.9z\" fill=\"#9aa4ae\" stroke=\"#4a545e\" stroke-width=\"0.7\"/><circle cx=\"11.4\" cy=\"4.6\" r=\"1.1\" fill=\"#e9edf2\" stroke=\"#4a545e\" stroke-width=\"0.5\"/>","/guides/":"<path d=\"M2 3h12v8H5l-3 3V3z\" fill=\"#ccddee\" stroke=\"#336699\" stroke-width=\"0.5\"/><circle cx=\"5.5\" cy=\"7\" r=\"1\" fill=\"#336699\"/><circle cx=\"8\" cy=\"7\" r=\"1\" fill=\"#336699\"/><circle cx=\"10.5\" cy=\"7\" r=\"1\" fill=\"#336699\"/>","/archives/":"<rect x=\"2\" y=\"3\" width=\"12\" height=\"11\" fill=\"#ccddee\" stroke=\"#336699\" stroke-width=\"0.5\"/><rect x=\"2\" y=\"3\" width=\"12\" height=\"3\" fill=\"#336699\"/><rect x=\"2\" y=\"8\" width=\"12\" height=\"2\" fill=\"#99bbdd\"/>","/thanks/":"<path d=\"M8 14s-5.5-3.4-5.5-7A3.2 3.2 0 0 1 8 4.6a3.2 3.2 0 0 1 5.5 2.4C13.5 10.6 8 14 8 14z\" fill=\"#ff8080\" stroke=\"#cc4444\" stroke-width=\"0.6\"/>"};
  var PAGE_ICON_FALLBACK = "<path d=\"M3 1h7l3 3v11H3V1z\" fill=\"#ffffff\" stroke=\"#003399\" stroke-width=\"1\"/><path d=\"M10 1v3h3\" fill=\"none\" stroke=\"#003399\" stroke-width=\"1\"/><line x1=\"5\" y1=\"7\" x2=\"11\" y2=\"7\" stroke=\"#003399\" stroke-width=\"1\"/><line x1=\"5\" y1=\"9\" x2=\"11\" y2=\"9\" stroke=\"#003399\" stroke-width=\"1\"/><line x1=\"5\" y1=\"11\" x2=\"9\" y2=\"11\" stroke=\"#003399\" stroke-width=\"1\"/>";
  /* 同一张表挂到 window 上：页面里临时要插个图标（错误提示之类）可以取这里。
     首页「快速导航」瓦片不靠它 —— 那些是在构建期由 xp_page_icon 标签直接渲染好的。 */
  try { window.hexo_page_icons = PAGE_ICONS; } catch (e) {}
  function setCurrentPage() {
    var path = window.location.pathname.replace(/index\.html$/, '');
    /* 任务栏左下角那个「当前页面名」也读导航配置（由构建期注入 PAGE_TITLES），
       免得导航改名后这里还显示旧名字（2026-10-14 同一个坑踩了两次）。 */
    var pages = {"/":"首页","/works/":"绘画","/blog/":"文字","/games/":"游戏","/tools/":"工具","/archives/":"归档","/tags/":"标签","/categories/":"分类","/thanks/":"致谢"};
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

  // ========== 托盘音量：静音 / 取消静音（对所有音频生效） ==========
  var muted = false;
  function applyMute() {
    var media = document.querySelectorAll('audio, video');
    for (var i = 0; i < media.length; i++) media[i].muted = muted;
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
          '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">' +
            '<circle cx="8" cy="8" r="7" fill="#e8b800" stroke="#8a6d00" stroke-width="1"/>' +
            '<rect x="7.2" y="4" width="1.6" height="5" fill="#3a2c00"/>' +
            '<rect x="7.2" y="10.4" width="1.6" height="1.6" fill="#3a2c00"/>' +
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
              '<circle cx="8" cy="8" r="7" fill="#e04343" stroke="#8a1f1f" stroke-width="1"/>' +
              '<path d="M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' +
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
