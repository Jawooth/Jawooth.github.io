
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
  function save() {
    if (!ap) return;
    try {
      localStorage.setItem(S, JSON.stringify({
        i: index, p: ap.audio ? ap.audio.currentTime : 0, playing: isPlaying,
        order: songs.map(function (s) { return String(s.title || '') + '||' + String(s.author || ''); })
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
    var inners = document.querySelectorAll('.mp4-title-inner');
    for (var k = 0; k < inners.length; k++) {
      var inner = inners[k];
      inner.classList.remove('mp4-marquee');
      void inner.offsetWidth;
      if (inner.scrollWidth > inner.clientWidth + 2) inner.classList.add('mp4-marquee');
    }
  }
  /* 把文本写进 inner（双份，供无缝循环）。量宽用单份宽度：两份后
     scrollWidth ≈ 单份 ×2 + gap，仍必然大于父宽，判断条件不变。 */
  function setMarqueeText(inner, text) {
    if (!inner) return;
    inner.textContent = '';
    var t1 = document.createElement('span');
    t1.className = 'mp4-marquee-copy';
    t1.textContent = text;
    var t2 = t1.cloneNode(true);
    inner.appendChild(t1);
    inner.appendChild(t2);
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
    /* ⚠ DRIVER 是模板字符串：正则里的反斜杠必须写双份（\d），
       写单份会被模板字面量吃掉变成 d —— 2026-10-12 修复：该链接因此从未显示过 */
    var m = String(s.url).match(/[?&]id=(\d+)/);
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
  var PIC_CDN_RE = /^https:\/\/p[1-4]\.music\.126\.net\/[A-Za-z0-9_\-=]+\/\d+\.[A-Za-z]{3,4}$/;
  function safePic(p) {
    if (!p) return '';
    p = String(p).trim();
    if (PIC_CDN_RE.test(p)) return p;
    if (p.charAt(0) === '/' && !/:|\/\/|\.\./.test(p)) return p;
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
    if (dot) dot.style.display = playing ? 'inline-block' : 'none';
    var btn = $('mp4-play'); if (btn) btn.setAttribute('aria-label', playing ? '暂停' : '播放');
    /* 呼吸辉光挂钩：播放态给容器加 is-playing，封面随之脉动（CSS 精修层）。
       浮动条挂在 #xp-music-floating 上；首页 bento 格里的播放器没有这层
       包裹，直接挂在最近的 .retro-mp4-player 上 —— 两处都照顾到。 */
    var fl = document.getElementById('xp-music-floating');
    if (fl) fl.classList.toggle('is-playing', !!playing);
    var box2 = fl || (btn && btn.closest ? btn.closest('.retro-mp4-player') : null);
    if (box2 && box2 !== fl) box2.classList.toggle('is-playing', !!playing);
  }

  function initPlayer() {
    if (!songs.length || typeof APlayer === 'undefined') { renderEmpty(); return; }

    songs = songs.slice();
    var st = load();
    var savedIndex = 0, savedProg = 0, shouldPlay = false;

    /* 恢复洗牌顺序 */
    function ko(a) { return a.map(function (s) { return String(s.title || '') + '||' + String(s.author || ''); }); }
    var cur = ko(songs), restored = false;
    if (st && Array.isArray(st.order) && st.order.length === songs.length) {
      var set = {}; cur.forEach(function (k) { set[k] = true; });
      if (st.order.every(function (k) { return !!set[k]; })) {
        var map = {}; songs.forEach(function (s) { map[ko([s])[0]] = s; });
        songs = st.order.map(function (k) { return map[k]; }).filter(Boolean);
        restored = true;
      }
    }
    if (!restored) {
      for (var i = songs.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = songs[i]; songs[i] = songs[j]; songs[j] = t;
      }
    }

    if (st && typeof st.i === 'number' && st.i >= 0 && st.i < songs.length) {
      savedIndex = st.i; savedProg = st.p || 0; shouldPlay = !!st.playing;
    }

    ap = new APlayer({
      container: $('aplayer-hidden'),
      audio: songs.map(function (s) {
        return { name: s.title, artist: s.author, url: s.url, cover: s.pic || '' };
      }),
      volume: 0.7
    });
    index = savedIndex;
    if (index > 0) ap.switchAudio(index);
    updateSongInfo(index);

    ap.on('loadeddata', function () {
      if (savedProg > 0 && ap.audio && ap.audio.duration) {
        ap.seek(Math.min(savedProg, ap.audio.duration - 0.5));
      }
      if (shouldPlay) { ap.play(); }
      savedProg = 0; shouldPlay = false;
    });
    ap.on('listswitch', function (info) {
      if (info && typeof info.index === 'number') index = info.index;
      updateSongInfo(index); save();
    });
    /* errC 统计「连续」加载失败次数，用来防止整张歌单都失效时无限跳歌。
       必须在成功播放时清零：否则一次会话里累计失败到 songs.length 次之后，
       自动跳歌就永久失效了（哪怕后面大多能正常播）。 */
    var errC = 0;
    ap.on('error', function () { errC += 1; if (errC < songs.length) next(); });

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
    ap.on('ended', function () { next(); });
    ap.on('play', function () { isPlaying = true; setPlaying(true); errC = 0; save(); });
    ap.on('pause', function () { isPlaying = false; setPlaying(false); save(); });

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
  function prev() {
    if (!ap) return;
    index = (index - 1 + songs.length) % songs.length;
    ap.switchAudio(index); updateSongInfo(index);
    if (isPlaying) ap.play();
  }
  function next() {
    if (!ap) return;
    index = (index + 1) % songs.length;
    ap.switchAudio(index); updateSongInfo(index);
    if (isPlaying) ap.play();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPlayer);
  else initPlayer();
})();
