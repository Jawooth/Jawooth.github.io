/* global hexo */
/**
 * 构建期增强：
 *   1. 正文图片补上原生 loading="lazy" / decoding="async"
 *      （主题自带的 lazyload 依赖 JS 且会把 src 换成占位图，这里改成浏览器原生方案）
 *   2. 文章页把标题变成 XP 窗口标题栏，并补上窗口按钮
 *   3. 归档 / 分类 / 标签 / 杂谈列表页补上窗口标题栏
 *   4. /blog/ 列表页注入待办窗口（原来是运行时 JS 插 DOM，现在服务端渲染）
 *   5. <title> 补站点名、head 补 canonical 与 og:url / og:type
 *   6. 文章正文图片点击放大（轻量 lightbox，只作用于文章正文，不影响卡片链接）
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

/* ---------------------------------------------------------- 文章页 lightbox */
const LIGHTBOX = `
(function () {
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
    if (img) { open(img); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box) { e.stopPropagation(); close(); }
  });
})();
`;
hexo.extend.injector.register('body_end', `<script>${LIGHTBOX}</script>`, 'post');

/* ---------------------------------------------------------- 2~5. HTML 后处理 */
const BULLET = '<span class="xp-window-btns" aria-hidden="true">' +
  '<i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>';

function titleBar(label) {
  return `<div class="xp-window-title"><span class="xp-window-title-text">${label}</span>${BULLET}</div>`;
}

function todoWindow() {
  const todoMini = hexo.extend.helper.get('xp_todo_mini');
  const body = todoMini ? todoMini(5) : '';
  return `<div class="xp-window blog-todo-window">` +
    `<div class="xp-window-title"><span class="xp-window-title-text">` +
    `<svg class="inline-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">` +
    `<rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#003399" stroke-width="0.5"/>` +
    `<rect x="2" y="1" width="12" height="3" rx="1" fill="#0066cc" stroke="#003399" stroke-width="0.5"/>` +
    `<rect x="4" y="5.5" width="2" height="2" fill="#66cc66" stroke="#003399" stroke-width="0.8"/>` +
    `<path d="M4.5 6.5l1 1 2-2" fill="none" stroke="#fff" stroke-width="0.8"/>` +
    `<line x1="7" y1="6.5" x2="12" y2="6.5" stroke="#003399" stroke-width="0.6"/>` +
    `<rect x="4" y="8.5" width="2" height="2" fill="none" stroke="#003399" stroke-width="0.8"/>` +
    `<line x1="7" y1="9.5" x2="12" y2="9.5" stroke="#003399" stroke-width="0.6"/>` +
    `<rect x="4" y="11.5" width="2" height="2" fill="none" stroke="#003399" stroke-width="0.8"/>` +
    `<line x1="7" y1="12.5" x2="12" y2="12.5" stroke="#003399" stroke-width="0.6"/>` +
    `</svg> 待办清单</span>${BULLET}</div>` +
    `<div class="xp-window-body">${body}</div></div>`;
}

hexo.extend.filter.register('after_render:html', (str, data) => {
  const page = (data && data.page) || {};

  /* 5a. <title> 补站点名 */
  if (SITE_TITLE) {
    str = str.replace(/<title>([\s\S]*?)<\/title>/, (m, raw) => {
      const title = raw.trim();
      if (!title) return `<title>${SITE_TITLE}</title>`;
      if (title.indexOf(SITE_TITLE) >= 0) return `<title>${title}</title>`;
      return `<title>${title}${SEP}${SITE_TITLE}</title>`;
    });
  }

  /* 5b. canonical + og:url / og:type */
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

  /* 自定义 XP 桌面页（layout: xp-page）自己就是桌面，不再套窗口外壳。
     用 layout 判断为主，HTML 特征作为兜底。 */
  const isCustomPage = page.layout === 'xp-page' || /xp-page-fullwidth|home-page/.test(str);
  if (isCustomPage) return str;
  if (str.indexOf('class="content-container"') === -1) return str;

  /* 2. 先给所有套壳页面打上 xp-shell 标记（CSS 里文章/列表排版都以它为作用域） */
  let bar = '';
  // 主题用同名生成器替换了官方 hexo-generator-index，且没有设置 __index 标记，
  // 因此这里以「页面里出现 .post-item 列表、且不是标签/分类页」作为杂谈列表的判据。
  const isBlogIndex = /class="post-item"/.test(str) && !/current-(tag|category)-container/.test(str);
  if (!page.__post) {
    if (/class="archives-container"/.test(str)) {
      bar = titleBar('归档 / 分类');
    } else if (/class="tags-container"/.test(str)) {
      bar = titleBar('标签');
    } else if (page.__index || isBlogIndex) {
      bar = titleBar('杂谈 · 全部文章') + todoWindow();
    }
  }
  str = str.replace('<div class="content-container">', `<div class="content-container xp-shell">${bar}`);

  /* 3. 文章标题 -> 窗口标题栏（标题与 .post-detail 之间可能夹着 hero 图，用宽松匹配） */
  if (page.__post) {
    str = str.replace(
      /(<h2 class="post-title">)([\s\S]*?)(<\/h2>)/,
      (m, open, title, close) => `${open}<span class="post-title-text">${title.trim()}</span>${BULLET}${close}`
    );
  }

  /* 4. 标签页标题同样变成标题栏 */
  if (/class="current-tag-container"/.test(str)) {
    str = str.replace(
      /(<div class="current-tag-container">[\s\S]*?<h2 class="title">)([\s\S]*?)(<\/h2>)/,
      (m, open, inner, close) => `${open}<span class="post-title-text">${inner.replace(/<i[^>]*><\/i>/, '').trim()}</span>${BULLET}${close}`
    );
  }

  return str;
});
