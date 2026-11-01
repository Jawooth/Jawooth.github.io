/* global hexo */
const { routeJs } = require('./_xp-route-js');

/* XP 泡泡屏保（2026-10-19 站主要求）
 *
 * 行为：约 30 秒无任何操作（鼠标/键盘/滚动/触摸）→ 全屏深色层浮起，
 * 一串大泡泡在屏幕内部漂浮（左右摆 + 上下浮动，不出屏；纯 CSS 动画，零图片
 * 资源），像 Windows XP 经典的气泡屏保。任意键 / 点击 / 触摸 即退出。
 * 底部提示只显示一次（localStorage 记账，站主 2026-10-19 要求）。
 *
 * 设计约定：
 *  · 与蓝屏彩蛋同构：覆盖层 + restore() 一处收干净（教训见 xp-taskbar.js
 *    的 stopGlitch 作用域注释 —— 所有回收逻辑集中在一个函数里，幂等）。
 *  · prefers-reduced-motion 用户不触发（动画对他们不是装饰是负担）。
 *  · 闲置计时在屏保显示期间停止；退出后重新计时 —— 不会「退出又立刻触发」。
 *  · 手机上同样生效；但屏保层 z-index 低于任务栏/开始菜单，管理界面永远可点。
 *  · 播放器暂停交给 CSS 无法做的事：这里不碰音频（站里音频都是用户手动开的，
 *    开着就说明人在看 —— 而人在操作就不会触发屏保）。
 */
/* 配置读 _config.yml 的 screensaver: 段（站主改时长不用进 JS）：
     screensaver:
       idle_seconds: 30    # 闲置多少秒触发（默认 30，2026-10-19 站主定的）
       bubbles: 14         # 泡泡数量（默认 14，上限 40，大小 80–200px 屏内随机漂浮）
       tip: 按任意键退出屏保 # 底部提示文字（只显示一次，之后靠记住交互）
   任何一项没配都有兜底。⚠ 与 xp-taskbar.js 同一坑：配置要在渲染期读，
   不能模块顶层求值（那时配置还没合并），所以这里是函数不是常量。 */
function screensaverCfg() {
  const c = (hexo.config && hexo.config.screensaver) || {};
  const num = (v, dflt) => (Number(v) > 0 ? Number(v) : dflt);
  return {
    /* 2026-10-19 站主：默认 60 → 30 秒（手机/桌面统一缩短） */
    idleMs: num(c.idle_seconds, 30) * 1000,
    bubbles: Math.min(num(c.bubbles, 14), 40),
    tip: (c.tip === undefined || c.tip === null || c.tip === '') ? '按任意键退出屏保' : String(c.tip),
  };
}
routeJs(hexo, '/js/xp-screensaver.js', () => `
(function () {
  if (window.__XP_SCREENSAVER__) return;
  window.__XP_SCREENSAVER__ = true;

  var IDLE_MS = ${screensaverCfg().idleMs};
  var BUBBLES = ${screensaverCfg().bubbles};
  var TIP = ${JSON.stringify(screensaverCfg().tip)};

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
})();`);

/* footer.ejs 引用的注入标签：输出一行 <script src>（脚本本体在上面 routeJs） */
hexo.extend.helper.register('xp_screensaver', () =>
  '<script src="/js/xp-screensaver.js" defer></script>');
