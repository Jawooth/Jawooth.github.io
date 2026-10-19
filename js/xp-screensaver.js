
(function () {
  if (window.__XP_SCREENSAVER__) return;
  window.__XP_SCREENSAVER__ = true;

  var IDLE_MS = 30000;
  var BUBBLES = 14;
  var TIP = "按任意键退出屏保";

  var timer = null;
  var active = false;
  var layer = null;

  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function show() {
    if (active || reducedMotion()) return;
    active = true;
    layer = document.createElement('div');
    layer.className = 'xp-screensaver';
    layer.setAttribute('role', 'alertdialog');
    layer.setAttribute('aria-label', '屏幕保护');
    var html = '';
    var vw = window.innerWidth || 1280;
    var vh = window.innerHeight || 800;
    /* 手机瘦身（2026-10-19 实测：安卓手机上 14 颗泡泡直接把页面卡死几秒、
       渲染停摆 —— hue-rotate 滤镜动画每帧都强制重光栅化，低端 GPU 扛不住）。
       小屏减到 6 颗；CSS 端 ≤640px 同步禁掉滤镜动画和 will-change。 */
    var count = (vw < 640) ? Math.min(BUBBLES, 6) : BUBBLES;
    /* 泡泡位置：随机但互不重叠（2026-10-19 站主要求）。
       简单可靠的「拒绝采样」：逐颗随机放，与已放的算圆心距，
       叠了就重掷（最多 40 次，兜底放宽间距避免死循环）。 */
    var placed = [];
    for (var i = 0; i < count; i++) {
      var size = 40 + Math.floor(Math.random() * 181);              /* 40–220px，大小差多 */
      var r = size / 2;
      var margin = size * 0.15;                                     /* 额外留缝，更好看 */
      var left = 0, top = 0, ok = false, tries = 0;
      while (!ok) {
        tries++;
        left = Math.floor(Math.random() * Math.max(1, vw - size));
        top = Math.floor(Math.random() * Math.max(1, vh - size));
        ok = true;
        for (var j = 0; j < placed.length; j++) {
          var dx = (left + r) - placed[j].x, dy = (top + r) - placed[j].y;
          /* 需要的间距 = 两圆半径和 + 两次的 margin；兜底：试 40 次还不行就按 70% 间距接受 */
          var need = r + placed[j].r + margin + placed[j].m;
          if (tries > 40) need *= 0.7;
          if (dx * dx + dy * dy < need * need) { ok = false; break; }
        }
      }
      placed.push({ x: left + r, y: top + r, r: r, m: margin });
      var dur = (6 + Math.random() * 5).toFixed(1);                 /* sway 6–11s */
      var bob = (4 + Math.random() * 4).toFixed(1);                 /* bob 4–8s */
      var hueDur = (8 + Math.random() * 8).toFixed(1);              /* 变色一圈 8–16s */
      var delay = (-Math.random() * 8).toFixed(1);                  /* 负延迟=开场即动 */
      var hue = Math.floor(Math.random() * 360);                    /* 每颗随机色相起点，之后自己转圈变色 */
      html += '<div class="xp-ss-bubble" style="left:' + left + 'px;top:' + top + 'px;' +
        'width:' + size + 'px;height:' + size + 'px;--h:' + hue + ';' +
        'animation-duration:' + dur + 's,' + bob + 's,' + hueDur + 's;' +
        'animation-delay:' + delay + 's,' + delay + 's,' + delay + 's;"></div>';
    }
    /* 底部提示只在第一次触发时显示（localStorage 记账，站主要求：
       不换浏览器/不清缓存就只提示一次 —— 之后的屏保不再出字）。 */
    var showTip = true;
    try {
      showTip = !localStorage.getItem('xp-screensaver-tip-shown');
      if (showTip) localStorage.setItem('xp-screensaver-tip-shown', '1');
    } catch (e) {}
    if (showTip) html += '<div class="xp-ss-tip">' + TIP + '</div>';
    layer.innerHTML = html;
    document.body.appendChild(layer);

    /* 退出：任何操作（2026-10-19 站主：移动鼠标也要能解除 —— 屏保的意义
       就是「一动就回去」，不再区分轻重）。键盘/滚轮挂 document 捕获；
       鼠标移动只挂层上（挂 document 的话 show() 里自己动的鼠标不影响，
       但层出现后任何 mousemove 都该退）；触摸滑动累积超 24px。 */
    document.addEventListener('keydown', restore, true);
    document.addEventListener('wheel', restore, true);
    layer.addEventListener('pointerdown', restore);
    layer.addEventListener('mousemove', restore);
    layer.addEventListener('touchstart', restore, { passive: true });
    layer.addEventListener('touchmove', restore, { passive: true });
  }

  function restore() {
    if (!active) return;
    active = false;
    document.removeEventListener('keydown', restore, true);
    document.removeEventListener('wheel', restore, true);
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
    reset();            /* 退出即重新计时 —— 别退出下一秒又弹回来 */
  }

  function reset() {
    if (reducedMotion()) return;              /* 这类用户永远不触发 */
    lastActive = Date.now();
    timerSet = true;
  }

  /* ⚠ 不用 setTimeout 做闲置计时（2026-10-19 实测：手机放桌上 70 秒，
     setTimeout 一次都没跑 —— 移动浏览器对可冻结页面的定时器是「冻结不补跑」，
     interval 恢复后却会立刻补跑一拍）。改用时间戳轮询：每秒看一次
     「现在 - 最后活动时间」够不够 IDLE_MS；页面被冻结时 interval 停走，
     恢复的瞬间就会补跑并立即触发屏保 —— 语义正好正确（人回来了，
     但已经闲置了很久，屏保理应弹出）。 */
  var lastActive = Date.now();
  var timerSet = false;
  setInterval(function () {
    if (!timerSet || active || reducedMotion()) return;
    if (Date.now() - lastActive >= IDLE_MS) {
      timerSet = false;
      fire();
    }
  }, 1000);

  /* 到点触发。手机上有个坑：息屏/切后台时浏览器会冻结（或加速清掉）
     setTimeout —— 计时到点时页面往往正处于隐藏状态，直接 show() 会
     看不见或被系统拦掉。所以：到点时若页面隐藏，先记下「已到点」，
     等回到前台（visibilitychange）立刻弹出来。 */
  function fire() {
    if (active) return;
    if (document.hidden) {
      document.addEventListener('visibilitychange', onVisible, { once: true });
      return;
    }
    show();
  }
  function onVisible() {
    document.removeEventListener('visibilitychange', onVisible);
    if (!document.hidden && !active) show();
  }

  /* 回到前台时重新计时（别用后台里已失真的旧计时） */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !active) reset();
  });

  /* 任何「人还在」的信号都重置计时 */
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function (ev) {
    document.addEventListener(ev, reset, { passive: true });
  });
  reset();
})();