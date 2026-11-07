/* global hexo */
'use strict';

/* ============================================================
   XP 播放器 —— 外观与行为（页内组件）
   ------------------------------------------------------------
   2026-11-04 站主要求：播放器融入页面，不再是右下角浮层。
     · 三种落位（同一套标记，按容器不同变形）：
         ① 首页便当格 `.bento-music` —— 竖排卡片
         ② 列表页 / 文章页侧栏首卡    —— 竖排卡片（292px 宽）
         ③ 单栏页（/tags/ /categories/ /thanks/ /404）底部一条 —— 横排
     · 取消「拖动 / 隐藏 / 折叠 / 调节大小」四套交互：
       位置由容器决定，形态由 CSS 决定，只有一种展开态。
     · 曲目 / 歌单 / 窗口标题 / 空状态文字都在 source/_data/music.yml，
       只有想改「长相」或「行为」时才需要动本文件。
   ============================================================ */

/* ⚠ 与 scripts/xp-content.js 里那份逐字相同，是有意保留的：Hexo 把每个
   scripts/*.js 分别包进独立 IIFE，两者作用域不共享，抽公共模块只能挂
   globalThis，反而更差。要改就两边一起改。 */
const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 播放器外观。
   2026-11-04 站主要求：播放器融入页面，不再是右下角浮层。
     · variant='card' —— 首页便当格 / 侧栏卡片：竖排（LCD 屏 = 抬头 + 歌词窗口）
     · variant='bar'  —— 单栏页末条：横排一行（封面 + 歌名 / 歌手 │ 当前歌词）
   同时去掉「隐藏」和「折叠」两套状态：页内只有一种形态，不占额外按钮位。

   2026-11-05 站主要求「播放器过大过空」+「能不能显示歌词」：
     把原来整块只放一个圆形封面的 LCD 屏改成「抬头 + 歌词窗口」——
       抬头：小封面 + 歌名（跑马灯）+ 歌手 + 右上角 3/44 曲序
       屏身：五行歌词窗口，中间一行是当前行（绿色荧光、字号最大），
             上下各两行做上下文，整体居中，切行时只换文字不重排。
     纯音乐（无歌词）自动退化成「大封面 + 歌名 + 歌手」，不会留一片空屏。
     歌词数据是构建期抓好的同源 JSON（见 scripts/xp-content.js 的 lyricsBundle），
     运行时只 fetch 自己域名 —— 网易云接口没有 CORS 头，浏览器直连必失败。 */
function markup(title, variant) {
  var bar = String(variant || '') === 'bar';
  /* 固定五个格子：-2 / -1 / 当前 / +1 / +2，JS 只改文字与类名 */
  var cells = '';
  for (var k = 0; k < 5; k++) cells += '<div class="mp4-lyric"></div>';
  return `
<div class="xp-music-slot${bar ? ' is-bar' : ' is-card'}" data-xp-player>
<div class="retro-mp4-player mp4-floating">
<div class="mp4-brand"><span class="mp4-note" aria-hidden="true"><svg viewBox="0 0 16 16"><g fill="currentColor"><path d="M5.1 3.4v7.2a1.9 1.9 0 1 0 1.5-1.86V5.5l5.2-1.18v5.28a1.9 1.9 0 1 0 1.5-1.86V2.2a.7.7 0 0 0-.86-.68L5.84 2.72a.7.7 0 0 0-.74.68z"/></g></svg></span>${esc(title)}<span class="mp4-note" aria-hidden="true"><svg viewBox="0 0 16 16"><g fill="currentColor"><path d="M5.1 3.4v7.2a1.9 1.9 0 1 0 1.5-1.86V5.5l5.2-1.18v5.28a1.9 1.9 0 1 0 1.5-1.86V2.2a.7.7 0 0 0-.86-.68L5.84 2.72a.7.7 0 0 0-.74.68z"/></g></svg></span></div>
<!-- 浏览器自动播放策略拦下首播时的提示（APlayer 会吞掉 NotAllowedError，用户会以为播放器坏了）。
     默认 hidden，只有 JS 确认「点了播放但还是 paused」时才显示。 -->
<div class="mp4-autoplay-hint" id="mp4-autoplay-hint" role="status" hidden>浏览器不让自动播放<br>点「▶」继续</div>
<div class="mp4-screen">
<div class="mp4-screen-content${bar ? ' mp4-screen-h' : ' mp4-screen-v'}">
<div class="mp4-lcd-head">
<div class="mp4-cover"><div class="mp4-cover-placeholder" id="mp4-cover">
<svg width="28" height="28" viewBox="0 0 16 16" aria-hidden="true">
<use href="#icon-media-note"></use>
</svg>
</div></div>
<div class="mp4-song-info">
<div class="mp4-song-title-wrap"><span class="mp4-play-indicator" id="mp4-play-indicator"></span><span class="mp4-song-title" id="mp4-title"><span class="mp4-title-inner">未配置曲目</span></span></div>
<div class="mp4-song-author" id="mp4-author"></div>
</div>
<span class="mp4-track-num" id="mp4-tracknum"></span>
</div>
<div class="mp4-lyrics" id="mp4-lyrics">${cells}</div>
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
</div>
</div>
</div>
<div id="aplayer-hidden" style="display:none"></div>
`;
}

/* 播放器行为：页内组件 + LocalStorage 续播 + 歌名滚动 + 跳转原曲 */
const DRIVER = `
(function () {
  if (window.__XP_MUSIC_INITED__) return;
  window.__XP_MUSIC_INITED__ = true;

  if (window.XP_MUSIC_EMBED) return;

  var songs = window.XP_MUSIC || [];
  var S = 'xp_music_state_v1';        /* 主状态：index/progress/playing/order */
  var SS = S + '_s';                  /* 老版本的大小档位键，仅用于清理，不再读写 */
  /* ---- 顺序 / 随机播放（2026-10-21 改造，设计说明见 initPlayer 顶部） ---- */
  var mode = 'random';        /* random = 每轮重洗 · list = 按 yml 原始顺序 */
  var randKeys = [];          /* 随机档的排列（曲目键数组） */
  var origKeys = [];          /* yml 原始顺序（曲目键数组） */
  var failed = {};            /* 本次会话里加载失败的曲目键 —— 自动跳歌时跳过 */
  var lastKey = '';           /* 刚播完那首：重洗尾巴时避开，别让下一轮立刻重复 */
  var prevSwitch = -1;        /* 上次 listswitch 的下标，用来识别「一轮走完回到第 1 首」 */
  /* 2026-11-04 起播放器是页内元素（便当格 / 侧栏卡片 / 单栏页底条），
     不再有「浮动 / 收起 / 隐藏 / 缩放」四套状态 —— 尺寸完全由 CSS 网格决定，
     所以这里没有 data-touch、没有 SC/SH/SS 的读写。老版本残留的
     xp_music_state_v1_c / _h / _s 三个键会在下面清掉，避免旧设备带着
     「收起」状态进来却发现已经不能展开。 */

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

  /* ---- 位置 / 隐藏 / 缩放：2026-11-04 全部下线 ----
     播放器现在是页内元素（首页便当格、侧栏首卡、单栏页底条），位置由所在容器
     决定，没有浮动坐标可存；「折叠」和「隐藏」两套状态也按站主要求删掉了。
     老设备里残留的 xp_music_state_v1_c（折叠）、_h（隐藏）、_s（大小档）
     三个键在这里一次性清掉 —— 否则它们会永远躺在 LocalStorage 里没人读。 */
  try {
    localStorage.removeItem(S + '_c');
    localStorage.removeItem(S + '_h');
    localStorage.removeItem(S + '_s');
    localStorage.removeItem(S + '_p');
  } catch (e) {}

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

  /* ---- 歌词（2026-11-05）----
     数据来源是构建期抓好的同源 JSON：/js/xp-lyrics.json（脚本见
     tools/fetch/fetch-lyrics.py，由 scripts/xp-content.js 的 routeJs 输出）。
     为什么不运行时直连网易云：那个接口**没有任何 Access-Control-* 响应头**，
     浏览器同页 fetch 必被 CORS 拦；它也不支持 JSONP（带 &callback= 仍返回纯
     JSON）。所以只能构建期抓、运行时读自己域名。
     34/44 首有歌词，剩下 10 首是纯音乐 —— 拿不到就退化成「大封面」形态，
     不会留一片空屏（见 CSS 的 .is-nolyric）。 */
  var LYR = {};          /* { 曲目 id: [{t: 秒, s: 文本}, …] } */
  var TL = {};           /* { 曲目 id: { 秒: 译文 } } —— 只有部分歌有 */
  var lyrReady = false;  /* JSON 是否已到位（没到位时先按无歌词画，到了再刷新） */
  var lyrCur = -1;       /* 当前行下标，-1 = 还没定位 */

  function trackId(o) {
    if (!o) return '';
    var m = String(o.url || '').match(/[?&]id=(\\d+)/);
    return m ? m[1] : '';
  }

  /* LRC → [{t,s}]。只认 [mm:ss.xx] 或 [mm:ss]；一行多时间轴（副歌复用）会拆成多条。
     同一时间点出现多行（对唱/双语）合并成一条，用 / 分隔，避免五格里两行同秒。

     2026-11-05：**过滤制作信息行**。网易云把「作词 : xxx」「作曲 : xxx」「编曲 : xxx」
     也塞进了带时间轴的歌词正文（时间戳 00:00.00 / 00:01.00），直接渲染的话
     一首歌开头 5~10 秒屏里全是署名、没有一句真歌词。这些行不是歌词，扔掉：
       · 命中 CREDIT_RE 的行（key 后面紧跟冒号）
       · 纯分隔符（横线、斜线、星号）与纯空白
     真歌词里偶尔也会出现「词 : …」这种句子，但概率极低，且被误删只是少一行。 */
  var CREDIT_RE = /^(作词|作曲|编曲|词|曲|制作人|监制|出品|发行|录音|混音|母带|和声|伴唱|吉他|贝斯|鼓|键盘|弦乐|编曲人|原唱|翻唱|演唱|策划|统筹|美术|设计|OP|SP|ISRC|词曲)\\s*[:：]/i;
  function lrcParse(text) {
    var out = [], byT = {};
    String(text || '').split(/\\r?\\n/).forEach(function (line) {
      var tags = line.match(/^\\[(\\d{1,3}):(\\d{1,2})(?:[.:](\\d{1,3}))?\\]/g);
      if (!tags) return;
      var body = line.replace(/^(\\[[^\\]]*\\])+/, '').trim();
      if (!body) return;
      if (CREDIT_RE.test(body)) return;
      if (/^[-—–*\\/·]+$/.test(body)) return;
      var sec = 0;
      tags.forEach(function (tag) {
        var m = tag.match(/^\\[(\\d{1,3}):(\\d{1,2})(?:[.:](\\d{1,3}))?\\]/);
        if (!m) return;
        var frac = m[3] ? parseInt(m[3], 10) / (m[3].length === 3 ? 1000 : 100) : 0;
        sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac;
        if (byT[sec] != null) out[byT[sec]].s += ' / ' + body;
        else { byT[sec] = out.length; out.push({ t: sec, s: body }); }
      });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  /* 取当前下标：最后一行的 t ≤ 当前时间。二分，timeupdate 每 ~250ms 都会调。 */
  function lyricIndexAt(lines, t) {
    var lo = 0, hi = lines.length - 1, ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (lines[mid].t <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }

  /* 五格渲染：-2 / -1 / 当前 / +1 / +2。中间格留给当前行，上下各两行上下文。

     2026-11-05：cur < 0 = 前奏（还没唱到第一句）。以前这里 cur<0 会让五格
     全部算成越界、屏里一片空；而 paintTick 又会因为「算出来的 cur 还是 -1、
     和 lyrCur 相同」提前 return，于是整个前奏都是空的。现在前奏改铺「开头
     五行」、全部按上下文灰显示（不标当前行），第一句到点时再正常高亮。 */
  function paintLyric(lines, cur) {
    var box = $('mp4-lyrics');
    if (!box) return;
    var cells = box.children;
    var pre = cur < 0;
    /* 横条形态只显示当前这一句（.mp4-screen-h .mp4-lyric:not(.is-cur){display:none}）。
       前奏时一个 is-cur 都没有 ⇒ 五格全被隐藏、歌词区高度塌成 0，屏里只剩歌名。
       给容器挂个 is-pre，让 CSS 把第一格（前奏铺的就是开头第一句）放出来。 */
    box.classList.toggle('is-pre', pre);
    var song = songs[index];
    var trans = (song && TL[trackId(song)]) || null;
    for (var k = 0; k < cells.length; k++) {
      var off = k - 2;
      var li = pre ? k : cur + off;
      var cell = cells[k];
      var txt = (li >= 0 && li < lines.length) ? lines[li].s : '';
      /* 比较用 dataset 记的原文，不能读 cell.textContent —— 有译文的格
         textContent 会把译文也算进去，每帧都判定「变了」而重排一次。 */
      if (cell.getAttribute('data-lrc') !== txt) {
        cell.textContent = txt;
        cell.setAttribute('data-lrc', txt);
      }
      cell.classList.toggle('is-cur', !pre && off === 0 && !!txt);
      cell.classList.toggle('is-near', pre ? !!txt : ((off === -1 || off === 1) && !!txt));
      /* 译文只挂在当前行上：整行原文与译文各占一行会挤掉上下两行上下文，
         所以其余格维持原文，只有当前格长成「两块」。 */
      var tlText = '';
      if (!pre && off === 0 && txt && trans) tlText = trans[li] || '';
      var tlEl = cell.querySelector('.mp4-lyric-tl');
      if (!tlText) {
        if (tlEl) tlEl.parentNode.removeChild(tlEl);
        cell.classList.remove('has-tl');
      } else {
        if (!tlEl) {
          tlEl = document.createElement('span');
          tlEl.className = 'mp4-lyric-tl';
          cell.appendChild(tlEl);
        }
        if (tlEl.textContent !== tlText) tlEl.textContent = tlText;
        cell.classList.add('has-tl');
      }
    }
  }

  /* 换歌时调用：把屏内容切成「有歌词 / 无歌词」两种形态，并立刻画一次 */
  function applyLyrics() {
    var song = songs[index];
    var content = document.querySelector('.mp4-screen-content');
    var lines = (song && LYR[trackId(song)]) || null;
    var has = !!(lines && lines.length);
    if (content) content.classList.toggle('is-nolyric', !has);
    /* -99 是「强制重画一次」的哨兵：写成 -1 的话，前奏里 paintTick 算出来的
       cur 也是 -1，会被「行号没变」的短路直接 return，屏里就一直空着。 */
    lyrCur = -99;
    if (!has) {
      var box = $('mp4-lyrics');
      if (box) {
        for (var k = 0; k < box.children.length; k++) {
          box.children[k].textContent = '';
          box.children[k].classList.remove('is-cur', 'is-near');
        }
      }
      return;
    }
    if (ap && ap.audio) paintTick(ap.audio.currentTime || 0);
    else paintLyric(lines, 0);
  }

  /* timeupdate 里每帧走一次；行号没变就直接返回，省掉五次 DOM 写 */
  function paintTick(t) {
    var song = songs[index];
    var lines = (song && LYR[trackId(song)]) || null;
    if (!lines || !lines.length) return;
    var cur = lyricIndexAt(lines, t);
    if (cur === lyrCur) return;
    lyrCur = cur;
    paintLyric(lines, cur);
  }

  function loadLyrics() {
    if (typeof fetch !== 'function') return;
    fetch('/js/xp-lyrics.json', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.lyrics) return;
        var map = {}, tlMap = {};
        for (var id in data.lyrics) {
          if (!Object.prototype.hasOwnProperty.call(data.lyrics, id)) continue;
          var arr = lrcParse(data.lyrics[id]);
          if (!arr.length) continue;
          map[id] = arr;
          /* 译文按「原文行号 → 文本」索引：两边时间戳理论上一致，但网易云偶尔
             差几十毫秒，用秒做键会整行对不上。改成给每一行原文找最近的译文行，
             容差 0.6 秒（同一句的两种写法），找不到就不显示。 */
          var raw = data.tlrc && data.tlrc[id];
          if (!raw) continue;
          var tlLines = lrcParse(raw);
          if (!tlLines.length) continue;
          var byIdx = {};
          for (var li = 0; li < arr.length; li++) {
            var best = '', bestD = 0.6;
            for (var ti = 0; ti < tlLines.length; ti++) {
              var d = Math.abs(tlLines[ti].t - arr[li].t);
              if (d <= bestD) { bestD = d; best = tlLines[ti].s; }
            }
            if (best) byIdx[li] = best;
          }
          if (Object.keys(byIdx).length) tlMap[id] = byIdx;
        }
        LYR = map;
        TL = tlMap;
        lyrReady = true;
        applyLyrics();     /* 数据晚到：把当前这首重画一遍 */
      })
      .catch(function () { lyrReady = true; });
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
    /* 曲序角标：3/44（总曲目数在 APlayer 起来后才定，所以两端都做兜底） */
    var num = $('mp4-tracknum');
    if (num) {
      var total = (ap && ap.list && ap.list.audios.length) ? ap.list.audios.length : songs.length;
      num.textContent = total ? (i + 1) + '/' + total : '';
    }
    applyLyrics();          /* 换歌 → 切「歌词 / 大封面」形态，并重画五格 */
    setTimeout(marquee, 0);
  }

  function setPlaying(playing) {
    isPlaying = playing;
    if (playing) hideAutoplayHint();
    var p = $('icon-play'), pu = $('icon-pause'), dot = $('mp4-play-indicator');
    if (p) p.style.display = playing ? 'none' : '';
    if (pu) pu.style.display = playing ? '' : 'none';
    if (dot) dot.style.display = '';   /* 2026-10-20：绿点常驻（播放常亮/暂停闪烁由 CSS is-playing 控制） */
    var btn = $('mp4-play'); if (btn) btn.setAttribute('aria-label', playing ? '暂停' : '播放');
    /* 播放态给容器加 is-playing（绿点常亮、封面脉动由 CSS 控制）。
       2026-11-04 页内化后外层统一是 .xp-music-slot，用 data-xp-player 找；
       内层 .retro-mp4-player 也挂一份，因为 :not(.is-playing) 那条闪烁
       规则是照着它写的。 */
    var slot = document.querySelector('.xp-music-slot[data-xp-player]');
    if (slot) slot.classList.toggle('is-playing', !!playing);
    /* 2026-10-21：两处都挂 —— 外层给页内卡片的容器用，
       内层 .retro-mp4-player 给 :not(.is-playing) 的闪烁规则用。 */
    var box2 = btn && btn.closest ? btn.closest('.retro-mp4-player') : null;
    if (box2) box2.classList.toggle('is-playing', !!playing);
  }

  /* 2026-11-02：自动播放被浏览器拦下时的可见提示。
     APlayer 的 play() 会 catch 掉 NotAllowedError，用户只看到图标变成「暂停」，
     不知道是浏览器不让播。这里把提示条显示出来，点播放键后自动消失。 */
  function showAutoplayHint() {
    var h = $('mp4-autoplay-hint');
    if (!h) return;
    h.hidden = false;
    h.classList.add('is-visible');
    if (h._timer) clearTimeout(h._timer);
    h._timer = setTimeout(hideAutoplayHint, 6000);
  }
  function hideAutoplayHint() {
    var h = $('mp4-autoplay-hint');
    if (!h) return;
    h.hidden = true;
    h.classList.remove('is-visible');
    if (h._timer) { clearTimeout(h._timer); h._timer = null; }
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
    /* 2026-11-02：APlayer 的 <audio> 是运行时 createElement 出来的，从不挂进 DOM，
       所以任务栏的静音键（document.querySelectorAll('audio, video')）抓不到它 ——
       以前点托盘的喇叭对音乐一点用都没有。把这一路暴露出去，任务栏就能管住它。 */
    window.__XP_AUDIO__ = ap.audio;
    /* 任务栏可能比播放器先起来（点了静音再加载音频），这里补一次状态同步。 */
    if (window.__XP_MUTED__) ap.audio.muted = !!window.__XP_MUTED__;
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
      if (shouldPlay) {
        ap.play();
        /* 2026-11-02：浏览器会自动播放策略拦下首播时，APlayer 把 NotAllowedError
           吞掉、只把图标翻成「暂停」，用户以为播放器坏了。补一句人话提示。 */
        setTimeout(function () {
          if (ap && ap.audio && ap.audio.paused) showAutoplayHint();
        }, 700);
      }
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
      paintTick(c);          /* 歌词跟时间轴走；行号没变时它内部直接返回 */
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

    /* 按钮绑定 —— 2026-11-04 页内化后只剩 5 个控件：
       上一首 / 播放暂停 / 下一首 / 随机-顺序 / 跳原页面。
       「调节大小」「折叠」「隐藏」三个按钮连同它们的 LocalStorage 状态一起删掉了。 */
    if ($('mp4-play')) $('mp4-play').addEventListener('click', toggle);
    if ($('mp4-prev')) $('mp4-prev').addEventListener('click', prev);
    if ($('mp4-next')) $('mp4-next').addEventListener('click', next);
    var modeBtn = $('mp4-mode');
    if (modeBtn) modeBtn.addEventListener('click', toggleMode);
    paintMode();

    var bar = $('mp4-progress-bar');
    if (bar) bar.addEventListener('click', function (e) {
      if (!ap || !ap.audio.duration) return;
      var r = bar.getBoundingClientRect();
      ap.seek(((e.clientX - r.left) / r.width) * ap.audio.duration);
    });

    /* 2026-11-04：这一段原来恢复「折叠 / 隐藏 / 大小档」三种状态。
       播放器页内化后三种状态都不存在了（页面布局决定它的形态），整块删除。 */

    /* 2026-11-05：歌词数据异步到位（同源 JSON，~40KB，不走每页 HTML）。
       先按「无歌词」把界面画好，数据到了再重画当前这首 —— 放在 initPlayer
       末尾而不是入口，是因为 ap 起来之后 updateSongInfo 才会跑第一遍。 */
    loadLyrics();
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
