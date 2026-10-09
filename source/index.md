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
<!-- 句子在 source/_data/quotes.yml 里维护，按 rotate_seconds 自动轮换 -->
<p id="sticky-text">加载中…</p>
<p class="bubble-from" id="sticky-from">—— 小站碎碎念</p>
</div>
</div>
</div>

<!-- ========== 带 1：我是谁 ========== -->
<div class="bento-item bento-profile">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text">
<svg class="inline-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
<circle cx="8" cy="5" r="3.5" fill="#ffcc99" stroke="#996633" stroke-width="0.5"></circle>
<path d="M2 14c0-4 3-6 6-6s6 2 6 6" fill="#6699cc" stroke="#336699" stroke-width="0.5"></path>
</svg>
用户账户
</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body">
<div class="profile-content">
<!-- 名字 / 介绍 / 图标 都在 source/_data/profile.yml 里改 -->
<img class="profile-avatar" src="{% xp_profile avatar %}" alt="{% xp_profile name %} 的头像" width="256" height="256">
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

<!-- ========== 带 1：复古 MP4 播放器 ========== -->
<div class="bento-item bento-music">
<!-- 曲目 / 歌单都在 source/_data/music.yml 里配置；这里只是播放器外观 -->
{% xp_music %}
<div class="retro-mp4-player">
<div class="mp4-brand"><svg width="10" height="10" viewBox="0 0 16 16" style="vertical-align:middle;margin-right:3px" aria-hidden="true"><path d="M4 13V4l8-2v8" fill="none" stroke="#0054e3" stroke-width="1.5"/><circle cx="4" cy="13" r="2.2" fill="#0054e3"/><circle cx="12" cy="11" r="2.2" fill="#0054e3"/></svg> XP-MP4 <svg width="10" height="10" viewBox="0 0 16 16" style="vertical-align:middle;margin-left:3px" aria-hidden="true"><path d="M4 13V4l8-2v8" fill="none" stroke="#0054e3" stroke-width="1.5"/><circle cx="4" cy="13" r="2.2" fill="#0054e3"/><circle cx="12" cy="11" r="2.2" fill="#0054e3"/></svg></div>
<div class="mp4-screen">
<div class="mp4-screen-content">
<div class="mp4-cover">
<div class="mp4-cover-placeholder" id="mp4-cover">
<svg width="28" height="28" viewBox="0 0 16 16" aria-hidden="true">
<circle cx="8" cy="8" r="6" fill="none" stroke="#7cfc00" stroke-width="1.5"></circle>
<circle cx="8" cy="8" r="2" fill="#7cfc00"></circle>
</svg>
</div>
</div>
<div class="mp4-song-info">
<div class="mp4-song-title"><span class="mp4-play-indicator" id="mp4-play-indicator" style="display:none"></span><span id="mp4-title">未配置曲目</span></div>
<div class="mp4-song-author" id="mp4-author">在 source/_data/music.yml 中添加</div>
<div class="mp4-song-album" id="mp4-album"></div>
</div>
</div>
</div>
<div class="mp4-progress-wrap">
<div class="mp4-progress-times">
<span id="mp4-current">00:00</span>
<span id="mp4-total">00:00</span>
</div>
<div class="mp4-progress-bar" id="mp4-progress-bar" role="progressbar" aria-label="播放进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
<div class="mp4-progress-fill" id="mp4-progress-fill"></div>
</div>
</div>
<div class="mp4-controls">
<button class="mp4-btn" id="mp4-prev" type="button" title="上一首" aria-label="上一首">
<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M11 2v12l-6-6 6-6z" fill="currentColor"></path><rect x="2" y="2" width="2" height="12" fill="currentColor"></rect></svg>
</button>
<button class="mp4-btn mp4-btn-play" id="mp4-play" type="button" title="播放/暂停" aria-label="播放">
<svg id="icon-play" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6V2z" fill="currentColor"></path></svg>
<svg id="icon-pause" width="16" height="16" viewBox="0 0 16 16" style="display:none" aria-hidden="true"><rect x="4" y="2" width="3" height="12" fill="currentColor"></rect><rect x="9" y="2" width="3" height="12" fill="currentColor"></rect></svg>
</button>
<button class="mp4-btn" id="mp4-next" type="button" title="下一首" aria-label="下一首">
<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2v12l6-6-6-6z" fill="currentColor"></path><rect x="12" y="2" width="2" height="12" fill="currentColor"></rect></svg>
</button>
</div>
<div id="aplayer-hidden" style="display:none"></div>
</div>
</div>

<!-- ========== 带 2：最近作品 ========== -->
<div class="bento-item bento-recent">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text">
<svg class="inline-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
<path d="M8 1C4 1 1 4 1 8s3 7 7 7c1 0 2-1 2-2s-1-1-1-2 1-2 2-2 2 1 2 2 1 2 2 2 2-1 2-2c0-3-3-7-7-7z" fill="#ff9999" stroke="#cc6666" stroke-width="0.5"></path>
<circle cx="5" cy="6" r="1.2" fill="#ff6666"></circle>
<circle cx="11" cy="6" r="1.2" fill="#66cc66"></circle>
<circle cx="5" cy="10" r="1.2" fill="#6666ff"></circle>
<circle cx="10" cy="11" r="1.2" fill="#ffff66"></circle>
</svg>
最近作品
</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body">
{% xp_recent_works 3 %}
</div>
</div>
</div>

<!-- ========== 带 3：最新文章 ========== -->
<div class="bento-item bento-articles">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#0066cc" stroke-width="0.5"/><path d="M4 5h8M4 8h8M4 11h5" stroke="#666" stroke-width="1" stroke-linecap="round"/></svg>
最新文章
</span>
</div>
<div class="xp-window-body compact-body">
{% xp_recent_posts 4 exclude=作品 %}
</div>
</div>
</div>

<!-- ========== 带 3：标签云 ========== -->
<div class="bento-item bento-tags">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8l6-6 6 6-6 6-6-6z" fill="#ffe0e0" stroke="#cc6666" stroke-width="0.5"/><circle cx="8" cy="8" r="2" fill="#cc6666"/></svg>
标签云
</span>
</div>
<div class="xp-window-body compact-body">
{% xp_tag_cloud pill %}
</div>
</div>
</div>

<!-- ========== 带 3：小站数据 ========== -->
<div class="bento-item bento-stats">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" fill="#f0f0e8" stroke="#666" stroke-width="0.5"/><path d="M3 12l3-4 3 2 4-6" fill="none" stroke="#60b060" stroke-width="1.5"/></svg>
小站数据
</span>
</div>
<div class="xp-window-body compact-body">
{% xp_stat_rows %}
</div>
</div>
</div>

<!-- ========== 带 3：快速导航 ========== -->
<div class="bento-item bento-nav">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#e0e8ff" stroke="#003399" stroke-width="0.5"/><path d="M8 3v5l3 3" fill="none" stroke="#003399" stroke-width="1.5" stroke-linecap="round"/></svg>
快速导航
</span>
</div>
<div class="xp-window-body compact-body">
<div class="quick-nav-grid">
<a class="nav-tile" href="/works/"><span class="nav-icon"><svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1C4 1 1 4 1 8s3 7 7 7c1 0 2-1 2-2s-1-1-1-2 1-2 2-2 2 1 2 2 1 2 2 2 2-1 2-2c0-3-3-7-7-7z" fill="#ff9999" stroke="#cc6666" stroke-width="0.5"/><circle cx="5" cy="6" r="1.2" fill="#ff6666"/><circle cx="11" cy="6" r="1.2" fill="#66cc66"/><circle cx="5" cy="10" r="1.2" fill="#6666ff"/><circle cx="10" cy="11" r="1.2" fill="#ffff66"/></svg></span><span>作品集</span></a>
<a class="nav-tile" href="/games/"><span class="nav-icon"><svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="4" width="12" height="8" rx="3" fill="#4a4a4a" stroke="#222" stroke-width="0.5"/><circle cx="5" cy="8" r="1.5" fill="#d0d0d0"/><circle cx="11" cy="7" r="1" fill="#ff6b6b"/><circle cx="12" cy="9" r="1" fill="#6b8cff"/><rect x="4" y="7" width="2" height="0.8" fill="#d0d0d0"/><rect x="4.6" y="6.2" width="0.8" height="2.5" fill="#d0d0d0"/></svg></span><span>游戏</span></a>
<a class="nav-tile" href="/guides/"><span class="nav-icon"><svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v12H2z" fill="#c44" stroke="#900" stroke-width="0.5"/><path d="M14 2H9v12h5V2z" fill="#47c" stroke="#039" stroke-width="0.5"/><line x1="7" y1="2" x2="9" y2="2" stroke="#666" stroke-width="0.5"/><line x1="7" y1="14" x2="9" y2="14" stroke="#666" stroke-width="0.5"/></svg></span><span>攻略</span></a>
<a class="nav-tile" href="/blog/"><span class="nav-icon"><svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#666" stroke-width="0.5"/><line x1="4" y1="5" x2="12" y2="5" stroke="#666" stroke-width="0.8"/><line x1="4" y1="8" x2="12" y2="8" stroke="#666" stroke-width="0.8"/><line x1="4" y1="11" x2="9" y2="11" stroke="#666" stroke-width="0.8"/></svg></span><span>杂谈</span></a>
</div>
</div>
</div>
</div>

<!-- ========== 带 4：搜索 · 关于 · 致谢（通栏；/#about 锚点指这里） ========== -->
<div class="bento-item bento-links">
<div class="xp-window" id="about">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="#333" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>
搜索 · 关于本站 · 致谢
</span>
</div>
<div class="xp-window-body compact-body links-body">
<div class="links-col">
<form class="xp-search-wrap" id="site-search-form" role="search">
<div class="xp-search-box">
<label class="xp-sr-only" for="site-search-input">搜索文章</label>
<input type="search" class="xp-search-input" id="site-search-input" placeholder="搜索文章…" autocomplete="off">
<button class="xp-search-btn" id="site-search-btn" type="submit">Go</button>
</div>
<div class="xp-search-results" id="site-search-results"></div>
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
<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14s-5.5-3.4-5.5-7A3.2 3.2 0 0 1 8 4.6a3.2 3.2 0 0 1 5.5 2.4C13.5 10.6 8 14 8 14z" fill="#ff8080" stroke="#cc4444" stroke-width="0.5"/></svg>
致谢 &amp; 参考
</div>
<ul class="credits-list">
<li><a href="https://hexo.io/" target="_blank" rel="noopener">Hexo</a> · 静态站点生成器</li>
<li><a href="https://botoxparty.github.io/XP.css/" target="_blank" rel="noopener">XP.css</a> · XP 风格灵感</li>
<li><a href="https://npmjs.com/package/hexo-theme-minimalism" target="_blank" rel="noopener">minimalism</a> · 主题基础框架</li>
<li><a href="https://aplayer.js.org/" target="_blank" rel="noopener">APlayer</a> · 音乐播放器（可选）</li>
<li><a href="https://fonts.google.com/specimen/Caveat" target="_blank" rel="noopener">Caveat</a> · 手写英文字体</li>
<li>AI 助手 · 协助搭建与设计</li>
</ul>
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
  var textEl = document.getElementById('sticky-text');
  var fromEl = document.getElementById('sticky-from');
  if (!list.length || !textEl) return;

  var idx = Math.floor(Math.random() * list.length);

  function render(i) {
    var q = list[((i % list.length) + list.length) % list.length];
    textEl.style.opacity = '0';
    setTimeout(function () {
      textEl.textContent = '「' + (q.text || '') + '」';
      if (fromEl) fromEl.textContent = q.from ? ('—— ' + q.from) : '—— 小站碎碎念';
      textEl.style.opacity = '1';
    }, 220);
  }

  function start() {
    render(idx);
    var seconds = Number(data.rotate) || 0;
    if (seconds > 0 && list.length > 1) {
      setInterval(function () { idx += 1; render(idx); }, seconds * 1000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
</script>

<!-- ========== 网名轮换：名字列表在 source/_data/profile.yml 的 names 里 ========== -->
<script>
(function () {
  var data = window.XP_NAMES || { list: [], rotate: 0 };
  var list = data.list || [];
  var el = document.getElementById('xpName');
  if (!el || list.length < 2) return;

  var idx = Math.floor(Math.random() * list.length);
  el.textContent = list[idx];

  var seconds = Number(data.rotate) || 0;
  if (seconds > 0) {
    setInterval(function () {
      idx = (idx + 1) % list.length;
      el.style.opacity = '0';
      setTimeout(function () { el.textContent = list[idx]; el.style.opacity = '1'; }, 200);
    }, seconds * 1000);
  }
})();
</script>

<!-- ========== 复古 MP4 播放器（曲目来自 source/_data/music.yml） ========== -->
<script>
(function () {
  var songs = window.XP_MUSIC || [];
  var $ = function (id) { return document.getElementById(id); };
  var index = 0;
  var ap = null;
  var isPlaying = false;

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderEmpty() {
    var title = $('mp4-title');
    if (title) title.textContent = '未配置曲目';
    ['mp4-play', 'mp4-prev', 'mp4-next'].forEach(function (id) {
      var btn = $(id);
      if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
    });
    var bar = $('mp4-progress-bar');
    if (bar) { bar.style.cursor = 'default'; bar.removeAttribute('role'); }
    var screen = document.querySelector('.mp4-screen');
    if (screen) screen.classList.add('is-empty');
  }

  function updateSongInfo(i) {
    var song = songs[i];
    if (!song) return;
    if ($('mp4-title')) $('mp4-title').textContent = song.title || '';
    if ($('mp4-author')) $('mp4-author').textContent = song.author || '';
    if ($('mp4-album')) $('mp4-album').textContent = song.album || '';
  }

  function setPlaying(playing) {
    isPlaying = playing;
    var play = $('icon-play');
    var pause = $('icon-pause');
    var dot = $('mp4-play-indicator');
    if (play) play.style.display = playing ? 'none' : '';
    if (pause) pause.style.display = playing ? '' : 'none';
    if (dot) dot.style.display = playing ? 'inline-block' : 'none';
    var btn = $('mp4-play');
    if (btn) btn.setAttribute('aria-label', playing ? '暂停' : '播放');
  }

  function initPlayer() {
    if (!songs.length || typeof APlayer === 'undefined') { renderEmpty(); return; }
    ap = new APlayer({
      container: $('aplayer-hidden'),
      audio: songs.map(function (s) {
        return { name: s.title, artist: s.author, url: s.url, cover: s.pic || '' };
      }),
      volume: 0.7
    });
    updateSongInfo(index);

    ap.on('timeupdate', function () {
      var current = ap.audio.currentTime || 0;
      var total = ap.audio.duration || 0;
      if ($('mp4-current')) $('mp4-current').textContent = formatTime(current);
      if ($('mp4-total')) $('mp4-total').textContent = formatTime(total);
      if (total > 0) {
        var percent = (current / total) * 100;
        var fill = $('mp4-progress-fill');
        if (fill) fill.style.width = percent + '%';
        var bar = $('mp4-progress-bar');
        if (bar) bar.setAttribute('aria-valuenow', String(Math.round(percent)));
      }
    });
    ap.on('ended', function () { next(); });

    if ($('mp4-play')) $('mp4-play').addEventListener('click', toggle);
    if ($('mp4-prev')) $('mp4-prev').addEventListener('click', prev);
    if ($('mp4-next')) $('mp4-next').addEventListener('click', next);
    var bar = $('mp4-progress-bar');
    if (bar) {
      bar.addEventListener('click', function (e) {
        if (!ap || !ap.audio.duration) return;
        var rect = bar.getBoundingClientRect();
        ap.seek(((e.clientX - rect.left) / rect.width) * ap.audio.duration);
      });
    }
  }

  function toggle() {
    if (!ap) return;
    if (isPlaying) { ap.pause(); setPlaying(false); }
    else { ap.play(); setPlaying(true); }
  }
  function prev() {
    if (!ap) return;
    index = (index - 1 + songs.length) % songs.length;
    ap.switchMusic(index);
    updateSongInfo(index);
    if (isPlaying) ap.play();
  }
  function next() {
    if (!ap) return;
    index = (index + 1) % songs.length;
    ap.switchMusic(index);
    updateSongInfo(index);
    if (isPlaying) ap.play();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPlayer);
  else initPlayer();
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
     规则：12 栏 × 固定 96px 行高（gap 18px），每个横带 = 2 行 = 210px，
     同一横带里的窗口上下边缘自然对齐。DOM 顺序与视觉顺序保持一致。
     想要"手工拼贴感"可以在格子上加回 .tilt-left / .tilt-right / .tilt-soft 等类，
     但边线就不会齐平了。 -->
<style>
.xp-bento { grid-auto-rows: 96px; }
/* 快速导航现在只有 4 个瓦片（作品集/游戏/攻略/杂谈），排成 2×2 更整齐 */
.bento-nav .quick-nav-grid { grid-template-columns: repeat(2, 1fr); }

/* 带 1：身份带 —— 气泡 / 我 / 播放器 */
.bento-bubble  { grid-column: 1 / 4;   grid-row: 1 / 3; }
.bento-profile { grid-column: 4 / 10;  grid-row: 1 / 3; }
.bento-music   { grid-column: 10 / 13; grid-row: 1 / 3; }

/* 带 2：最近作品（原先右侧的待办窗口已按站主要求撤掉，这里占满整行） */
.bento-recent  { grid-column: 1 / 13;  grid-row: 3 / 5; }

/* 带 3：四等分 —— 文章 / 标签 / 数据 / 导航 */
.bento-articles{ grid-column: 1 / 4;   grid-row: 5 / 7; }
.bento-tags    { grid-column: 4 / 7;   grid-row: 5 / 7; }
.bento-stats   { grid-column: 7 / 10;  grid-row: 5 / 7; }
.bento-nav     { grid-column: 10 / 13; grid-row: 5 / 7; }

/* 带 4：通栏（搜索 · 关于本站 · 致谢）；原「关于本站」窗口已并入这里，故整行 2 行高 */
.bento-links   { grid-column: 1 / 13;  grid-row: 7 / 9; }

@media (max-width: 900px) {
  /* 小屏放弃固定行高，回到内容决定高度 */
  .xp-bento { grid-auto-rows: auto; }
  .bento-bubble  { grid-column: 1 / 7;  grid-row: auto; }
  .bento-profile { grid-column: 1 / 7;  grid-row: auto; }
  .bento-music   { grid-column: 1 / 7;  grid-row: auto; }
  .bento-recent  { grid-column: 1 / 7;  grid-row: auto; }
  .bento-articles{ grid-column: 1 / 4;  grid-row: auto; }
  .bento-tags    { grid-column: 4 / 7;  grid-row: auto; }
  .bento-stats   { grid-column: 1 / 4;  grid-row: auto; }
  .bento-nav     { grid-column: 4 / 7;  grid-row: auto; }
  .bento-links   { grid-column: 1 / 7;  grid-row: auto; }
}
</style>
