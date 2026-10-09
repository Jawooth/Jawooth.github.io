/* global hexo */
/**
 * 构建期增强（外壳结构已移到主题模板，这里只做模板做不到的事）
 *   1. 正文图片补原生 loading="lazy" / decoding="async"
 *   2. 文章页注入：图片点击放大 + 目录跟随滚动高亮
 *   3. <title> 补站点名、head 补 canonical 与 og:url / og:type
 *
 * 历史：早期版本在这里用字符串替换给文章/列表页注入 XP 窗口外壳，
 * 一旦主题模板结构变化（例如文章带 hero 图）正则就会匹配失败而静默失效。
 * 现在结构由 themes/minimalism/layout/{post,page,index,archive,tag}.ejs 直接产出。
 */
'use strict';

const SITE_TITLE = (hexo.config && hexo.config.title) || '';
const SEP = ' | ';

/* ---------------------------------------------------------- 1. 原生懒加载 */
hexo.extend.filter.register('after_post_render', (data) => {
  if (!data.content || data.content.indexOf('<img') === -1) return;
  data.content = data.content.replace(/<img\b([^>]*?)\/?>/g, (match, attrs) => {
    if (/\bloading\s*=/.test(attrs)) return match;
    const selfClose = /\/$/.test(match) ? ' /' : '';
    return `<img${attrs} loading="lazy" decoding="async"${selfClose}>`;
  });
});

/* ---------------------------------------------------------- 2. 文章页脚本 */
const POST_SCRIPTS = `
(function () {
  /* ---------- 图片放大 ---------- */
  var box = null;
  var lastFocus = null;
  function close() {
    if (!box) return;
    box.remove();
    box = null;
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function open(img) {
    lastFocus = img;
    box = document.createElement('div');
    box.className = 'xp-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '图片预览，按 Esc 关闭');
    var big = document.createElement('img');
    big.src = img.getAttribute('data-full') || img.currentSrc || img.src;
    big.alt = img.alt || '';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xp-lightbox-close';
    btn.setAttribute('aria-label', '关闭预览');
    btn.textContent = '×';
    box.appendChild(big);
    box.appendChild(btn);
    box.addEventListener('click', close);
    document.body.appendChild(box);
    document.documentElement.style.overflow = 'hidden';
    btn.focus();
  }
  document.addEventListener('click', function (e) {
    if (box) return;
    var target = e.target;
    if (!target || !target.closest) return;
    var img = target.closest('.post-content img');
    if (img) open(img);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box) { e.stopPropagation(); close(); }
  });

  /* ---------- 目录跟随滚动高亮 ---------- */
  var toc = document.querySelector('.xp-toc');
  if (!toc) return;
  var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;
  var targets = links.map(function (a) {
    try { return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); }
    catch (err) { return null; }
  });
  function sync() {
    var best = -1;
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      if (el && el.getBoundingClientRect().top - 90 <= 0) best = i;
    }
    if (best < 0) best = 0;   /* 还没滚到第一个标题时，默认高亮第一条 */
    links.forEach(function (a, i) { a.classList.toggle('current', i === best); });
  }
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id;
      try { id = decodeURIComponent(a.getAttribute('href').slice(1)); } catch (err) { return; }
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 76, behavior: 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + encodeURIComponent(id));
    });
  });
})();
`;
hexo.extend.injector.register('body_end', `<script>${POST_SCRIPTS}</script>`, 'post');

/* ---------------------------------------------------------- 3. 标题与 SEO */
hexo.extend.filter.register('after_render:html', (str, data) => {
  const page = (data && data.page) || {};

  /* <title> 补站点名（主题模板已改成输出 pageTitle，这里是兜底） */
  if (SITE_TITLE) {
    str = str.replace(/<title>([\s\S]*?)<\/title>/, (m, raw) => {
      const title = raw.trim();
      if (!title) return `<title>${SITE_TITLE}</title>`;
      if (title.indexOf(SITE_TITLE) >= 0) return `<title>${title}</title>`;
      return `<title>${title}${SEP}${SITE_TITLE}</title>`;
    });
  }

  /* canonical + og:url / og:type */
  const base = String(hexo.config.url || '').replace(/\/+$/, '');
  const rel = String((data && data.path) || '').replace(/index\.html$/, '');
  if (base && !/rel="canonical"/.test(str)) {
    const url = `${base}/${rel}`;
    const type = page.__post ? 'article' : 'website';
    str = str.replace('</head>',
      `<link rel="canonical" href="${url}">\n` +
      `<meta property="og:url" content="${url}">\n` +
      `<meta property="og:type" content="${type}">\n</head>`);
  }

  return str;
});
