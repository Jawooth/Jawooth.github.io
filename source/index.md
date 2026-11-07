---
title: 首页
layout: xp-page
---

<div class="home-page">
<div class="xp-bento">

<!-- ========== 带 1：气泡（尾巴指向右边的「用户账户」） ========== -->
<div class="bento-item bento-bubble tilt-note">
<div class="xp-bubble">
<div class="bubble-content">
<!-- 句子在 source/_data/quotes.yml 里维护，按 rotate_seconds 自动轮换；
     两侧的「」也在那里改（quote_left / quote_right），留空即不显示符号。
     下面 data-* 里的「」只是"脚本没跑时"的兜底，会被 quotes.yml 的值覆盖。
注意：这个便签元素全页只有这一处；xp_quotes 标签只输出数据与符号，不再输出元素。 -->
<p class="bubble-quote" id="sticky-quote" data-left="「" data-right="」"><span id="sticky-text">加载中…</span></p>
<!-- 出处那一行：quotes.yml 里那句没写 from（或写成 from: ''）时，脚本会自动把这一行整行藏起来 -->
<p class="bubble-from" id="sticky-from"></p>
</div>
</div>
</div>

<!-- ========== 带 1：我是谁 ========== -->
<div class="bento-item bento-profile">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='用户账户', icon='user' }) %>
<div class="xp-window-body">
<div class="profile-content">
<!-- 名字 / 介绍 / 图标 都在 source/_data/profile.yml 里改 -->
<img id="xp-avatar" class="profile-avatar" src="{% xp_profile avatar %}" alt="{% xp_profile name %} 的头像" width="256" height="256">
<div class="profile-text">
<h2>{% xp_profile_title %}</h2>
{% xp_profile_lines intro %}
<div class="profile-icons">
<!-- GitHub / 邮箱 / B站 / 小红书 等：在 profile.yml 的 contacts 里填地址，留空即隐藏 -->
{% xp_profile_icons %}
</div>
</div>
</div>
</div>
</div>
</div>

<!-- ========== 带 1：播放器 + 计数器 + 详细属性 ========== -->
<div class="bento-item bento-music">
<!-- ★ 2026-11-04：播放器改成页内组件，这一格竖叠三张 ——
     播放器卡（xp_music() 默认竖排卡片变体）/「唉，汁本！」鸭子计数 /「详细属性」。
     原来播放器是全站 fixed 浮层（includes/footer.ejs 注入），会压住这个格子，
     现在浮层已删，这一个就是全站唯一的播放器入口（每页各一份，切页靠
     LocalStorage 续进度，不是同一路音频流 —— 详见 README §14）。
     曲目 / 歌单 / 标题仍看 source/_data/music.yml；外观与行为看 scripts/xp-player.js。 -->
<!-- md 正文里不能写 EJS 的 include/helper 输出语法（xp-md-include 会报「未处理的 EJS 写法」），
     播放器在这里用 hexo tag 写法，默认竖排卡片变体。 -->
{% xp_music %}
<div class="xp-window xp-duck-window">
<%- include('./includes/xp-window-title', { title='唉，汁本！', icon='duck', buttons=false }) %>
<div class="xp-window-body xp-duck-body">
<div class="xp-duck-main">
<p class="xp-duck-line">已被做局</p>
<span class="xp-duck-num"><span class="xp-duck-count" id="duck-count">0</span><span class="xp-duck-line">次。</span></span>
</div>
<button class="xp-btn xp-btn-small xp-duck-clear" id="duck-clear" type="button">清除计数</button>
</div>
</div>
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='详细属性', icon='clipboard', buttons=false }) %>
<div class="xp-window-body">
<ul class="xp-intro-list">
<!-- ⚠ 2026-11-05 纠正：这张窗叫「详细属性」，列的必须是**置顶的自我介绍文**
     （front matter 里 sticky: 1 / sticky: 2 的那两篇）。上一轮我为了填空随手
     加了两条普通文章，链接文字还是自己编的（「死后会去哪里呢」实际标题是
     「死是凉爽的夏夜」、「平台带来的思考」实际是「关于平台的迷思」）——
     既不是置顶文、标题也对不上，已撤回。
     现在改成「标题 + 一句话简介（取文章 front matter 的 desc）」，用真实内容
     把窗填满，而不是拿无关链接凑数。 -->
<li><a href="/about-me/">呃可能是属性啥的吧</a><span class="xp-intro-desc">从空间日志搬过来的，字有点多不看也没事。</span></li>
<li><a href="/about-me2/">天雷滚滚好怕怕</a><span class="xp-intro-desc">关于我可能雷到你的地方。</span></li>
</ul>
</div>
</div>
</div>

<!-- ========== 带 2：最近作品 ========== -->
<div class="bento-item bento-recent">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='最近作品', icon='palette' }) %>
<div class="xp-window-body">
{% xp_recent_works 3 %}
</div>
</div>
</div>

<!-- ========== 带 3：最新文章 ========== -->
<div class="bento-item bento-articles">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='最新文章', icon='post', compact=true, buttons=false }) %>
<div class="xp-window-body compact-body">
{% xp_recent_posts 4 exclude=作品 %}
</div>
</div>
</div>

<!-- ========== 带 3：标签云 ========== -->
<div class="bento-item bento-tags">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='标签云', icon='tag', compact=true, buttons=false }) %>
<div class="xp-window-body compact-body">
{% xp_tag_cloud %}
</div>
</div>
</div>

<!-- ========== 带 3：小站数据 ========== -->
<div class="bento-item bento-stats">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='小站数据', icon='chart', compact=true, buttons=false }) %>
<div class="xp-window-body compact-body">
{% xp_stat_rows %}
</div>
</div>
</div>

<!-- ========== 带 3：快速导航 ========== -->
<div class="bento-item bento-nav">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='快速导航', icon='compass', compact=true, buttons=false }) %>
<div class="xp-window-body compact-body">
<div class="quick-nav-grid">
<!-- 图标与开始菜单/任务栏同一份真源（scripts/xp-taskbar.js 的 START_ICONS），
     由 xp_page_icon tag 构建期渲染 —— 站主 2026-10-18 要求两处文字图标统一。
     文字也用开始菜单的叫法（绘画/文字/游戏/工具）。 -->
<a class="nav-tile" href="/works/"><span class="nav-icon">{% xp_page_icon /works/ 20 %}</span><span>绘画</span></a>
<a class="nav-tile" href="/blog/"><span class="nav-icon">{% xp_page_icon /blog/ 20 %}</span><span>文字</span></a>
<a class="nav-tile" href="/games/"><span class="nav-icon">{% xp_page_icon /games/ 20 %}</span><span>游戏</span></a>
<a class="nav-tile" href="/archives/"><span class="nav-icon">{% xp_page_icon /archives/ 20 %}</span><span>归档</span></a>
<!-- 「工具」并入「游戏」（2026-11-01 站主要求）：/games/ 页并排两个窗口，
     导航不再单列工具；第 4 格换成「归档」补位。 -->
</div>
</div>
</div>
</div>

<!-- ========== 带 4：搜索 · 关于 · 致谢（通栏；/#about 锚点指这里） ========== -->
<div class="bento-item bento-links">
<div class="xp-window" id="about">
<%- include('./includes/xp-window-title', { title='搜索 · 关于本站 · 致谢', icon='search', compact=true, buttons=false }) %>
<div class="xp-window-body compact-body links-body">
<div class="links-col">
<form class="xp-search-wrap" id="site-search-form" role="search">
<div class="xp-search-box">
<label class="xp-sr-only" for="site-search-input">搜索文章</label>
<input type="search" class="xp-search-input" id="site-search-input" placeholder="搜索文章…" autocomplete="off">
<button class="xp-search-btn" id="site-search-btn" type="submit">搜索</button>
</div>
<!-- aria-live="polite"：搜索结果一改就朗读一遍，屏幕阅读器用户才知道「搜到了几条」。
     role="status" 是它的等价写法（隐含 aria-live=polite）。 -->
<div class="xp-search-results" id="site-search-results" role="status" aria-live="polite" aria-atomic="true"></div>
</form>
</div>
<!-- 关于本站：原先单独的「关于本站」窗口已并入这里（文案在 profile.yml 的 about: 下） -->
<div class="about-col">
<div class="about-home-body">
{% xp_profile_lines about.paragraphs %}
<div class="about-home-meta">
{% xp_profile_chips about.chips %}
</div>
</div>
</div>
<!-- 致谢：原先在「关于」页，现已搬到这里（删条目就删下面这几行） -->
<div class="credits-col">
<div class="credits-title">
<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><use href="#nav-thanks"/></svg>
致谢 &amp; 参考
</div>
<ul class="credits-list">
<li><a href="https://hexo.io/" target="_blank" rel="noopener">Hexo</a><span class="credits-use">静态站点生成器</span></li>
<li><a href="https://botoxparty.github.io/XP.css/" target="_blank" rel="noopener">XP.css</a><span class="credits-use">XP 界面风格</span></li>
<li><a href="https://npmjs.com/package/hexo-theme-minimalism" target="_blank" rel="noopener">minimalism</a><span class="credits-use">主题基础框架</span></li>
<li><a href="https://github.com/DIYgod/APlayer" target="_blank" rel="noopener">APlayer</a><span class="credits-use">页面内音乐播放器</span></li>
<li><a href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noopener">缝合像素字体</a><span class="credits-use">正文字体</span></li>
<li><a href="https://github.com/TakWolf/ark-pixel-font" target="_blank" rel="noopener">Ark Pixel</a><span class="credits-use">像素中文字体</span></li>
<li><a href="https://github.com/simple-icons/simple-icons" target="_blank" rel="noopener">Simple Icons</a><span class="credits-use">社交品牌图标</span></li>
<li><a href="https://iconpark.oceanengine.com/" target="_blank" rel="noopener">IconPark</a><span class="credits-use">界面图标</span></li>
<li><a href="https://98.js.org/" target="_blank" rel="noopener">98.js.org</a><span class="credits-use">桌面隐喻的灵感</span></li>
</ul>
<p class="credits-more"><a href="/thanks/">完整致谢与许可证 →</a></p>
</div>
</div>
</div>
</div>

</div>
</div>

<!-- ========== 便签：句子在 source/_data/quotes.yml 里维护 ========== -->
{% xp_quotes %}
<script>
(function () {
  var data = window.XP_QUOTES || { rotate: 0, list: [] };
  var list = data.list || [];
  var quoteEl = document.getElementById('sticky-quote');
  var textEl = document.getElementById('sticky-text');
  var fromEl = document.getElementById('sticky-from');
  if (!list.length || !textEl || !quoteEl) return;

  /* 符号与句子都来自 quotes.yml（符号经 window.XP_QUOTES 传进来）。
     写成 data-* 是为了让 CSS 的 ::before/::after 用 attr() 渲染，
     这样改文字不会碰到符号节点；data-* 里的值同时是"脚本没跑时"的兜底。 */
  if (data.left != null) quoteEl.setAttribute('data-left', data.left);
  if (data.right != null) quoteEl.setAttribute('data-right', data.right);

  var idx = Math.floor(Math.random() * list.length);

  function render(i) {
    var q = list[((i % list.length) + list.length) % list.length];
    quoteEl.style.opacity = '0';
    setTimeout(function () {
      textEl.textContent = q.text || '';
      /* 出处：quotes.yml 里那句没写 from、或写成 from: ''，这里就把整行藏起来。
         （以前没写出处会被兜底成「—— 小站碎碎念」，等于替句子硬加了一个来源。） */
      var fromText = (q.from === null || q.from === undefined) ? '' : String(q.from).trim();
      if (fromEl) {
        fromEl.textContent = fromText ? ('—— ' + fromText) : '';
        fromEl.style.display = fromText ? '' : 'none';
      }
      quoteEl.style.opacity = '1';
    }, 220);
  }

  function start() {
    render(idx);
    var seconds = Number(data.rotate) || 0;
    if (seconds > 0 && list.length > 1) {
      setInterval(function () { idx += 1; render(idx); }, seconds * 1000);
    }
  }

  /* 供头像点击彩蛋调用：换下一句（头像的脚本在下面「头像彩蛋」那块） */
  window.XPQuoteRefresh = function () { idx += 1; render(idx); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
</script>

<!-- ========== 网名轮换：名字列表在 source/_data/profile.yml 的 names 里 ========== -->
<script>
(function () {
  var el = document.getElementById('xpName');
  if (!el) return;
  var list = [];
  var rotate = 0;
  try { list = JSON.parse(el.getAttribute('data-names') || '[]'); } catch (e) {}
  if (typeof el.getAttribute('data-rotate') === 'string') rotate = Number(el.getAttribute('data-rotate')) || 0;
  if (list.length < 2) return;

  var idx = Math.floor(Math.random() * list.length);
  el.textContent = list[idx];

  var seconds = Number(rotate) || 0;
  if (seconds > 0) {
    setInterval(function () {
      idx = (idx + 1) % list.length;
      el.style.opacity = '0';
      setTimeout(function () { el.textContent = list[idx]; el.style.opacity = '1'; }, 200);
    }, seconds * 1000);
  }
})();
</script>


<!-- ========== 头像彩蛋：捏鸭子音效 + 弹跳 + 便签换句 + 做局计数 + 每满 100 次烟花 ==========
     计数器落在访问者浏览器的 localStorage（xp_duck_count），跨刷新累计；
     「清除计数」要点两次（3 秒内）才真的清零，防手滑。
     ★ 2026-10-18：这份实现取自已部署版本（.deploy_git/index.html）。
       之前从 backup/ 恢复的那份是删减版，缺 fireworks() 与 isMilestone()，
       所以点满 100 次没有庆祝弹窗 —— 改这里时别再把函数弄丢。 -->
<script>
(function () {
  /* —— 橡皮鸭音效：两声短促的「吱——咕」，锯齿波 + 音高包络 + 低通滤波 —— */
  function squeak() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      squeak.ctx = squeak.ctx || new AC();
      var ctx = squeak.ctx;
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      [0, 0.16].forEach(function (delay, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2400;
        filter.Q.value = 4;
        osc.type = 'sawtooth';
        var s = t + delay;
        var dur = i ? 0.22 : 0.18;
        var base = i ? 750 : 900;   /* 第二声低一点，像把鸭子挤到没气了 */
        osc.frequency.setValueAtTime(base, s);
        osc.frequency.exponentialRampToValueAtTime(base * 1.9, s + dur * 0.35);
        osc.frequency.exponentialRampToValueAtTime(base * 0.55, s + dur);
        gain.gain.setValueAtTime(0.0001, s);
        gain.gain.exponentialRampToValueAtTime(0.3, s + 0.02);   /* 峰值 0.3：比播放器音乐略响一档 */
        gain.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        osc.start(s); osc.stop(s + dur + 0.02);
      });
    } catch (e) { /* 音频出任何问题都不影响换句和弹跳 */ }
  }

  /* —— 烟花：一个固定遮罩 + 中心爆点 + 22 颗粒子向外飞散，2.05s 后整体淡出 ——
     DOM 节点全部由这里创建，样式在 xp-custom.css 的 .xp-firework* 一节。
     减弱动态效果时 N=0（不生成粒子），只留中间那句庆祝文字。 */
  function fireworks(times) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* 顺便播一声上扬的「咻——啪」，和鸭子音效同一套 Web Audio 合成 */
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        var ctx = squeak.ctx || (squeak.ctx = new AC());
        if (ctx.state === 'suspended') ctx.resume();
        var t0 = ctx.currentTime;
        /* 咻：音高快速上滑 */
        var o1 = ctx.createOscillator(), g1 = ctx.createGain();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(320, t0);
        o1.frequency.exponentialRampToValueAtTime(1500, t0 + 0.28);
        g1.gain.setValueAtTime(0.0001, t0);
        g1.gain.exponentialRampToValueAtTime(0.18, t0 + 0.05);
        g1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o1.connect(g1); g1.connect(ctx.destination);
        o1.start(t0); o1.stop(t0 + 0.32);
        /* 啪：一小撮噪声，用随机频率的高频振荡近似 */
        var o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'triangle';
        o2.frequency.setValueAtTime(900, t0 + 0.3);
        o2.frequency.exponentialRampToValueAtTime(180, t0 + 0.62);
        g2.gain.setValueAtTime(0.0001, t0 + 0.3);
        g2.gain.exponentialRampToValueAtTime(0.22, t0 + 0.33);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
        o2.connect(g2); g2.connect(ctx.destination);
        o2.start(t0 + 0.3); o2.stop(t0 + 0.68);
      }
    } catch (e) { /* 没声音也要放烟花 */ }

    /* 暴风式庆祝会一屏几十个节点，先清掉上一轮没结束的，避免叠在一起 */
    var old = document.querySelectorAll('.xp-firework');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);

    var layer = document.createElement('div');
    layer.className = 'xp-firework';
    layer.setAttribute('aria-hidden', 'true');

    var box = document.createElement('div');
    box.className = 'xp-firework-burst';

    var COLORS = ['#ff5a5a', '#ffd166', '#7cfc00', '#53a8f3', '#c77dff', '#ff9ecd'];
    var N = reduce ? 0 : 22;
    for (var k = 0; k < N; k++) {
      var p = document.createElement('i');
      var ang = (Math.PI * 2 * k) / N + Math.random() * 0.2;
      var dist = 70 + Math.random() * 90;
      p.className = 'xp-firework-dot';
      p.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
      p.style.background = COLORS[k % COLORS.length];
      p.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's';
      box.appendChild(p);
    }

    /* 中间的庆祝文字，顺便告诉访客「这次点击有彩蛋」 */
    var label = document.createElement('span');
    label.className = 'xp-firework-text';
    label.textContent = '🎉 第 ' + times + ' 次！';
    box.appendChild(label);

    layer.appendChild(box);
    document.body.appendChild(layer);

    var done = function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    };
    layer.addEventListener('animationend', function (ev) {
      /* 只认最外层那一次结束，避免被内部粒子的 animationend 提前拆掉 */
      if (ev.target === layer) done();
    });
    setTimeout(done, 2600);   /* 兜底：万一 animationend 没触发也别留垃圾节点 */
  }

  function init() {
    var avatar = document.getElementById('xp-avatar');
    if (!avatar) return;

    /* 捏鸭计数器：总数存访问者浏览器 localStorage，跨刷新累计 */
    var duckEl = document.getElementById('duck-count');
    var duckCount = 0;
    try { duckCount = parseInt(localStorage.getItem('xp_duck_count'), 10) || 0; } catch (e) {}
    /* m00789：位数多时给数字盒降字号（.many=5-6 位 / .huge=7 位+），
       配合 xp-custom.css 的 .xp-duck-num 规则，保证「已被做局 N 次。」+ 按钮一行放下 */
    function setDuck(n) {
      if (!duckEl) return;
      duckEl.textContent = n;
      var num = duckEl.parentNode;   // .xp-duck-num
      if (!num) return;
      var d = String(n).length;
      num.classList.toggle('many', d >= 5 && d <= 6);
      num.classList.toggle('huge', d >= 7);
    }
    setDuck(duckCount);

    /* 每满 100 次点击 —— 从 0 开始每累计 100 次放一次烟花（100 / 200 / 300…）。
       用「整除」判断而不是 ===100，这样 200、300 次也都会庆祝；
       刷新后从 localStorage 恢复计数，再点满下一个整百同样会触发。 */
    function isMilestone(n) { return n > 0 && n % 100 === 0; }

    avatar.addEventListener('click', function () {
      squeak();
      avatar.classList.remove('bouncing');
      void avatar.offsetWidth;   /* 强制重排：连续点击也能重放弹跳动画 */
      avatar.classList.add('bouncing');
      if (typeof window.XPQuoteRefresh === 'function') window.XPQuoteRefresh();
      duckCount += 1;
      try { localStorage.setItem('xp_duck_count', String(duckCount)); } catch (e) {}
      if (duckEl) setDuck(duckCount);
      if (isMilestone(duckCount)) fireworks(duckCount);
    });

    /* 清除计数：两段式确认 —— 第一次点变成「再点一次确认」，3 秒内再点才真的清零；
       超时没点就自动恢复原样，防止手滑把记录全删了。 */
    var clearBtn = document.getElementById('duck-clear');
    if (clearBtn) {
      var armTimer = null;
      clearBtn.addEventListener('click', function () {
        if (clearBtn.getAttribute('data-armed') === '1') {
          clearTimeout(armTimer);
          clearBtn.removeAttribute('data-armed');
          clearBtn.textContent = '已清零';
          duckCount = 0;
          try { localStorage.setItem('xp_duck_count', '0'); } catch (e) {}
          if (duckEl) setDuck('0');
          setTimeout(function () { clearBtn.textContent = '清除计数'; }, 1200);
        } else {
          clearBtn.setAttribute('data-armed', '1');
          clearBtn.textContent = '再点一次确认';
          armTimer = setTimeout(function () {
            clearBtn.removeAttribute('data-armed');
            clearBtn.textContent = '清除计数';
          }, 3000);
        }
      });
    }

    avatar.addEventListener('animationend', function () {
      avatar.classList.remove('bouncing');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
</script>


<!-- ========== 站内搜索（数据来自构建期生成的 /search.json） ========== -->
<script>
(function () {
  var input = document.getElementById('site-search-input');
  var form = document.getElementById('site-search-form');
  var results = document.getElementById('site-search-results');
  if (!input || !results) return;
  var posts = null;
  var loading = false;

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render(list, keyword) {
    if (!list.length) {
      results.innerHTML = '<p class="xp-search-hint">没有找到与「' + esc(keyword) + '」相关的文章</p>';
      return;
    }
    var html = '<ul>';
    list.slice(0, 6).forEach(function (p) {
      html += '<li><a href="' + esc(p.url) + '">' + esc(p.title) +
        '<span class="res-meta">' + esc(p.date) + ' · ' + esc(p.meta) + '</span></a></li>';
    });
    html += '</ul>';
    results.innerHTML = html;
  }

  function search(keyword) {
    var kw = keyword.trim().toLowerCase();
    if (!kw) { results.innerHTML = ''; return; }
    if (!posts) {
      if (loading) return;
      loading = true;
      results.innerHTML = '<p class="xp-search-hint">正在加载索引…</p>';
      fetch('/search.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { posts = (data && data.posts) || []; loading = false; search(keyword); })
        .catch(function () { loading = false; results.innerHTML = '<p class="xp-search-hint">索引加载失败</p>'; });
      return;
    }
    var hit = posts.filter(function (p) {
      return (p.title && p.title.toLowerCase().indexOf(kw) >= 0) ||
        (p.text && p.text.toLowerCase().indexOf(kw) >= 0) ||
        (p.meta && p.meta.toLowerCase().indexOf(kw) >= 0);
    });
    render(hit, keyword);
  }

  input.addEventListener('input', function () { search(input.value); });
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      search(input.value);
    });
  }
})();
</script>

<!-- ========== 页面级排布 ==========
     2026-11-02：这一段原来是一份内联 <style>（首页便当格的 12 栏定位表）。
     它和 source/css/xp-custom.css 里的同一张表各写一份、互相矛盾，
     谁生效取决于加载顺序 —— 已经把内联那份按原样搬进 xp-custom.css，
     这里的整块 <style> 删除，排布只剩一个真源。改首页布局请改
     source/css/xp-custom.css 的「首页便当格排布」一节。 -->
