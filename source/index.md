---
title: 首页
layout: xp-page
---

{% xp_music %}

<div class="home-page">
<div class="xp-bento">

<!-- ========== 大格：用户账户窗口 ========== -->
<div class="bento-item bento-profile tilt-left">
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
<img class="profile-avatar" src="/images/site-avatar.png" alt="站点头像" width="256" height="256">
<div class="profile-text">
<h2>你好，我是 <span class="username">Jawooth</span></h2>
<p>这里是我的像素风个人角落，存放着画作、攻略、小游戏和碎碎念。</p>
<p>欢迎随便逛逛，像操作 XP 桌面一样点击各个小窗口~</p>
<div class="profile-meta">
<span class="meta-chip"><strong>{% xp_num works %}</strong> 作品</span>
<span class="meta-chip"><strong>{% xp_num tags %}</strong> 标签</span>
<span class="meta-chip"><strong>∞</strong> 灵感</span>
</div>
<div class="profile-links">
<a class="xp-btn" href="/about/">关于我</a>
<a class="xp-btn" href="/works/">作品集</a>
<a class="xp-btn" href="/games/">小游戏</a>
</div>
</div>
</div>
</div>
</div>
</div>

<!-- ========== 小格：便签 ========== -->
<div class="bento-item bento-sticky tilt-note">
<div class="xp-sticky-note">
<div class="sticky-pin"></div>
<div class="sticky-note-content">
<p id="sticky-text">加载中…</p>
<p class="hitokoto-from" id="sticky-from">—— 小站碎碎念</p>
</div>
</div>
</div>

<!-- ========== 小格：站点统计 ========== -->
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

<!-- ========== 中格：复古 MP4 播放器 ========== -->
<div class="bento-item bento-music tilt-right">
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

<!-- ========== 宽格：最近作品 ========== -->
<div class="bento-item bento-recent tilt-soft">
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

<!-- ========== 窄格：待办事项 ========== -->
<div class="bento-item bento-todo">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#003399" stroke-width="0.5"/><rect x="2" y="1" width="12" height="3" rx="1" fill="#0066cc" stroke="#003399" stroke-width="0.5"/><rect x="4" y="5.5" width="2" height="2" fill="#66cc66" stroke="#003399" stroke-width="0.8"/><path d="M4.5 6.5l1 1 2-2" fill="none" stroke="#fff" stroke-width="0.8"/></svg>
待办事项
</span>
</div>
<div class="xp-window-body compact-body">
{% xp_todo 4 %}
</div>
</div>
</div>

<!-- ========== 中格：最近更新 ========== -->
<div class="bento-item bento-articles">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#0066cc" stroke-width="0.5"/><path d="M4 5h8M4 8h8M4 11h5" stroke="#666" stroke-width="1" stroke-linecap="round"/></svg>
最近更新
</span>
</div>
<div class="xp-window-body compact-body">
{% xp_recent_posts 4 %}
</div>
</div>
</div>

<!-- ========== 中格：快速导航 ========== -->
<div class="bento-item bento-nav tilt-rise">
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
<a class="nav-tile" href="/todo/"><span class="nav-icon"><svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#003399" stroke-width="0.5"/><rect x="2" y="1" width="12" height="3" rx="1" fill="#0066cc" stroke="#003399" stroke-width="0.5"/><rect x="4" y="5.5" width="2" height="2" fill="#66cc66" stroke="#003399" stroke-width="0.8"/><path d="M4.5 6.5l1 1 2-2" fill="none" stroke="#fff" stroke-width="0.8"/></svg></span><span>待办</span></a>
<a class="nav-tile" href="/about/"><span class="nav-icon"><svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3.5" fill="#fc9" stroke="#963" stroke-width="0.5"/><path d="M3 14c0-4 2.5-6 5-6s5 2 5 6" fill="#69c" stroke="#369" stroke-width="0.5"/></svg></span><span>关于</span></a>
</div>
</div>
</div>
</div>

<!-- ========== 中格：标签云 ========== -->
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

<!-- ========== 宽格：友情链接 + 搜索 ========== -->
<div class="bento-item bento-links tilt-drop">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="#333" stroke-width="1.5"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>
链接 &amp; 搜索
</span>
</div>
<div class="xp-window-body compact-body links-body">
<ul class="friend-links">
<li><a href="https://botoxparty.github.io/XP.css/" target="_blank" rel="noopener">XP.css</a></li>
<li><a href="https://hexo.io/" target="_blank" rel="noopener">Hexo</a></li>
<li><a href="https://github.com/" target="_blank" rel="noopener">GitHub</a></li>
</ul>
<form class="xp-search-wrap" id="site-search-form" role="search">
<div class="xp-search-box">
<label class="xp-sr-only" for="site-search-input">搜索文章</label>
<input type="search" class="xp-search-input" id="site-search-input" placeholder="搜索文章…" autocomplete="off">
<button class="xp-search-btn" id="site-search-btn" type="submit">Go</button>
</div>
<div class="xp-search-results" id="site-search-results"></div>
</form>
</div>
</div>
</div>

</div>
</div>

<!-- ========== 便签：手动句子（每次刷新轮换） ========== -->
<script>
(function () {
  var quotes = [
    { text: "于是我驻足享受无法复制的瞬间。", from: "网易云热评" },
    { text: "我们开始一起攀登，这长长的，长长的坡道。", from: "《Clannad》" },
    { text: "人生就是一列开往坟墓的列车，路途上会有很多站，很难有人可以自始至终陪着走完。", from: "《千与千寻》" },
    { text: "我迎着万束朝阳，于韶光中奔赴远方。", from: "网络" },
    { text: "生活不止眼前的苟且，还有诗和远方的田野。", from: "高晓松" },
    { text: "我们终其一生，就是要摆脱他人的期待，找到真正的自己。", from: "《无声告白》" },
    { text: "世界上只有一种真正的英雄主义，那就是认清生活的真相后依然热爱生活。", from: "罗曼·罗兰" }
  ];
  function show() {
    var q = quotes[Math.floor(Math.random() * quotes.length)];
    var textEl = document.getElementById('sticky-text');
    var fromEl = document.getElementById('sticky-from');
    if (textEl) textEl.textContent = '「' + q.text + '」';
    if (fromEl) fromEl.textContent = '—— ' + q.from;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
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

<!-- ========== 页面级排布（组件样式统一在 /css/xp-custom.css） ========== -->
<style>
.bento-profile { grid-column: 1 / 8; grid-row: span 3; }
.bento-music { grid-column: 11 / 13; grid-row: span 3; }
.bento-sticky { grid-column: 8 / 11; grid-row: span 1; }
.bento-stats { grid-column: 8 / 11; grid-row: span 2; }
.bento-recent { grid-column: 1 / 9; grid-row: span 2; }
.bento-todo { grid-column: 9 / 13; grid-row: span 2; }
.bento-articles { grid-column: 1 / 6; grid-row: span 2; }
.bento-nav { grid-column: 6 / 10; grid-row: span 2; }
.bento-tags { grid-column: 10 / 13; grid-row: span 2; }
.bento-links { grid-column: 1 / 13; grid-row: span 1; }

@media (max-width: 900px) {
  .bento-profile { grid-column: 1 / 7; grid-row: span 2; }
  .bento-music { grid-column: 4 / 7; grid-row: span 3; }
  .bento-sticky { grid-column: 1 / 4; grid-row: span 1; }
  .bento-stats { grid-column: 1 / 4; grid-row: span 2; }
  .bento-recent { grid-column: 1 / 7; grid-row: span 2; }
  .bento-todo { grid-column: 1 / 3; grid-row: span 2; }
  .bento-articles { grid-column: 3 / 7; grid-row: span 2; }
  .bento-nav { grid-column: 1 / 4; grid-row: span 2; }
  .bento-tags { grid-column: 4 / 7; grid-row: span 2; }
  .bento-links { grid-column: 1 / 7; grid-row: span 1; }
}
</style>
