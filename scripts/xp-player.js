/* global hexo */
'use strict';

/* ============================================================
   XP 播放器 —— 外观与行为
   ------------------------------------------------------------
   以前这三块是分开的，改一个播放器要同时动 .md 和 .js：
     · source/index.md 里的 <div class="retro-mp4-player">…</div>（外观）
     · source/index.md 里的 <script>(function(){…})()</script>（行为）
     · scripts/xp-content.js 里的 xp_music 标签（曲目数据 + APlayer 资源）
   现在首页只写一行 {% xp_music %}，其余全部由脚本输出。

   ★ 你平时要改的东西几乎都不在这个文件里，而在：
       source/_data/music.yml   —— 曲目 / 网易云歌单 id / 窗口标题 / 空状态文字
     只有想改播放器的「长相」或「行为」时，才需要动本文件。
   ============================================================ */

const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 播放器外观（原来的 source/index.md，一字未改） */
function markup(title) {
  return `
<div class="retro-mp4-player">
<div class="mp4-brand"><svg width="10" height="10" viewBox="0 0 16 16" style="vertical-align:middle;margin-right:3px" aria-hidden="true"><path d="M4 13V4l8-2v8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="13" r="2.2" fill="currentColor"/><circle cx="12" cy="11" r="2.2" fill="currentColor"/></svg> ${esc(title)} <svg width="10" height="10" viewBox="0 0 16 16" style="vertical-align:middle;margin-left:3px" aria-hidden="true"><path d="M4 13V4l8-2v8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="4" cy="13" r="2.2" fill="currentColor"/><circle cx="12" cy="11" r="2.2" fill="currentColor"/></svg></div>
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
`;
}

/* 播放器行为：驱动上面那份外观（原来的 source/index.md 内联脚本，一字未改） */
const DRIVER = `
(function () {
  /* 网易云歌单模式：iframe 已经铺满整个格子，把自带的假播放器界面藏起来，
     否则会同时出现「未配置曲目」和真的播放器 */
  if (window.XP_MUSIC_EMBED) {
    var fakePlayer = document.querySelector('.bento-music .retro-mp4-player');
    if (fakePlayer) fakePlayer.style.display = 'none';
    return;
  }

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
    if (title) title.textContent = (window.XP_MUSIC_UI || {}).empty || '未配置曲目';
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
    /* 封面铺到屏幕那块（曲目里的 pic；没有就露出占位图标） */
    var cover = $('mp4-cover');
    if (cover) {
      var ph = cover.querySelector('svg');
      if (song.pic) {
        cover.style.backgroundImage = 'url("' + song.pic + '")';
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
    /* 随机播放：每次打开页面把曲目顺序洗一遍（所以第一首也是随机的）。
       注意：**不要**给 APlayer 设 order: 'random' —— 它会让 APlayer 自己挑曲目，
       导致界面显示的封面/歌名与实际播放的音频对不上，上一首/下一首也会失效。 */
    songs = songs.slice();
    for (var i = songs.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = songs[i]; songs[i] = songs[j]; songs[j] = tmp;
    }
    ap = new APlayer({
      container: $('aplayer-hidden'),
      audio: songs.map(function (s) {
        return { name: s.title, artist: s.author, url: s.url, cover: s.pic || '' };
      }),
      volume: 0.7
    });
    updateSongInfo(index);

    /* 让界面始终跟着 APlayer 的真实曲目走：任何原因切换曲目都同步封面与文字 */
    ap.on('listswitch', function (info) {
      /* 注意：APlayer 是先触发 listswitch（带新 index）、**之后**才更新 list.index，
         所以这里必须用事件参数，不能读 ap.list.index（会慢一拍）。 */
      if (info && typeof info.index === 'number') index = info.index;
      updateSongInfo(index);
    });

    /* 某首歌播不了（下架/地区限制/直链失效）就自动跳到下一首，连续失败超过一轮就停 */
    var errCount = 0;
    ap.on('error', function () {
      errCount += 1;
      if (errCount < songs.length) next();
    });

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
    ap.switchAudio(index);
    updateSongInfo(index);
    if (isPlaying) ap.play();
  }
  function next() {
    if (!ap) return;
    index = (index + 1) % songs.length;
    ap.switchAudio(index);
    updateSongInfo(index);
    if (isPlaying) ap.play();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPlayer);
  else initPlayer();
})();
`;

module.exports = { markup, driver: DRIVER };
