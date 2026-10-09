/* global hexo */
/**
 * 内容渲染层：把「数字 / 列表 / 标签云 / 待办 / 卡片」统一交给构建期生成。
 *
 * 背景：首页原先手写死了文章数、作品列表、标签云和待办，导致
 * 「示例文章改日期 → 首页链接 404」「标签云里 7 个标签根本不存在」这类漂移。
 * 现在页面里只写 {% xp_xxx %}，数据一律来自 site.posts / site.tags 与 source/_data/*.yml。
 *
 * 可用标签：
 *   {% xp_num posts|tags|categories|works|workcats|months|todo_doing|todo_todo|todo_done|apps_game|apps_tool %}
 *   {% xp_stat_rows %}                  首页「小站数据」
 *   {% xp_recent_posts 4 %}              最近更新列表
 *   {% xp_recent_works 3 %}              最近作品横栏
 *   {% xp_tag_cloud pill|cloud %}        标签云（pill=首页胶囊 / cloud=作品页）
 *   {% xp_todo mini|full %}              待办（mini=首页与杂谈页 / full=待办页）
 *   {% xp_apps %}                        游戏/工具卡片（含分组标题条）
 *   {% xp_guides %}                      攻略/教程分组列表
 *   {% xp_work_cards %}                  作品页精选 + 普通卡片
 *   {% xp_work_filters %}                作品页分类筛选按钮
 */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORK_CATEGORY = '作品';
const PILL_CLASSES = [
  'tag-pixel', 'tag-char', 'tag-landscape', 'tag-sketch', 'tag-illust',
  'tag-guide', 'tag-essay', 'tag-game', 'tag-clannad', 'tag-life'
];
const CATEGORY_ICON = {
  '素描': 'icon-pencil',
  '角色设计': 'icon-girl',
  '插画': 'icon-frame'
};
const STATE_META = {
  doing: { label: '进行中', cls: 'tag-doing', row: 'doing' },
  todo: { label: '待做', cls: 'tag-todo', row: 'todo' },
  done: { label: '已完成', cls: 'tag-done', row: 'done' }
};

/* ---------------------------------------------------------------- 基础工具 */
const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const href = (p) => {
  if (!p) return '/';
  return encodeURI(p.charAt(0) === '/' ? p : '/' + p);
};

const oneLine = (html) => html.replace(/\n\s*/g, '');

function q2a(q) {
  if (!q) return [];
  if (Array.isArray(q)) return q.slice();
  if (typeof q.toArray === 'function') return q.toArray().slice();
  return Array.from(q);
}

function dataFile(name) {
  const file = path.join(hexo.base_dir, 'source', '_data', name + '.yml');
  try {
    return yaml.load(fs.readFileSync(file, 'utf8')) || [];
  } catch (err) {
    hexo.log.warn('[xp-content] 读取 %s 失败：%s', file, err.message);
    return [];
  }
}

/* ---------------------------------------------------------------- 数据查询 */
/*
 * 这里刻意不使用 hexo.locals.get('posts') / get('tags')。
 *
 * 原因：Hexo 的 locals 是惰性求值 + 缓存的，而 source/_posts 的 Category/Tag
 * 虚拟字段（hexo/dist/models/{category,tag}.js 的 `posts` virtual 会调用
 * ctx.locals.get('posts')）会在 load 阶段、文章还没全部入库时就把 'posts' 缓存下来。
 * 与此同时，source 下的页面文件在 load 阶段就会被渲染（早于 _runGenerators 的
 * invalidate），于是页面读到的是那份"只加载了一部分"的快照 —— 表现为首页统计
 * 数字和列表只显示一部分文章（例如 4 篇文章显示成 2 篇）。
 *
 * 直接查模型：始终反映当前数据库中完整的已发布文章。
 */
const isDraftEnabled = () => hexo.config.render_drafts || (hexo.env.args && hexo.env.args.draft);

function allPosts() {
  const query = {};
  if (!hexo.config.future) query.date = { $lte: Date.now() };
  if (!isDraftEnabled()) query.published = true;
  return q2a(hexo.database.model('Post').find(query, { lean: false })).sort((a, b) => b.date - a.date);
}

function allTags() {
  return q2a(hexo.database.model('Tag').find({}, { lean: false }))
    .filter((t) => t.length)
    .sort((a, b) => b.length - a.length);
}

function allCategories() {
  return q2a(hexo.database.model('Category').find({}, { lean: false })).filter((c) => c.length);
}

const catsOf = (post) => q2a(post.categories).map((c) => c.name);
const tagsOf = (post) => q2a(post.tags).map((t) => t.name);
const fmtDate = (post) => (post.date && post.date.format ? post.date.format('YYYY-MM-DD') : '');

function metaOf(post) {
  const cats = catsOf(post);
  if (cats.length) return cats[cats.length - 1];
  const tags = tagsOf(post);
  return tags.length ? tags[0] : '随笔';
}

const workPosts = () => allPosts().filter((p) => catsOf(p).includes(WORK_CATEGORY));

function workCategories() {
  const seen = [];
  workPosts().forEach((p) => {
    catsOf(p).forEach((name) => {
      if (name !== WORK_CATEGORY && seen.indexOf(name) < 0) seen.push(name);
    });
  });
  return seen;
}

function countByState(state) {
  return dataFile('todo').filter((t) => (t.state || 'todo') === state).length;
}

function guideItems() {
  const out = [];
  dataFile('guides').forEach((g) => {
    (g.items || []).forEach((it) => out.push(it));
  });
  return out;
}

function num(key) {
  switch (key) {
    case 'posts': return allPosts().length;
    case 'tags': return allTags().length;
    case 'categories': return allCategories().length;
    case 'works': return workPosts().length;
    case 'workcats': return workCategories().length;
    case 'months': return new Set(allPosts().map((p) => p.date.format('YYYY-MM'))).size;
    case 'todo_doing': return countByState('doing');
    case 'todo_todo': return countByState('todo');
    case 'todo_done': return countByState('done');
    case 'apps_game': return dataFile('apps').filter((a) => a.group === 'game').length;
    case 'apps_tool': return dataFile('apps').filter((a) => a.group === 'tool').length;
    case 'guides_planned': return guideItems().filter((it) => it.status !== 'online').length;
    case 'guides_online': return guideItems().filter((it) => it.status === 'online').length;
    default:
      hexo.log.warn('[xp-content] 未知的统计键：%s', key);
      return 0;
  }
}

/* ---------------------------------------------------------------- 片段渲染 */
const BULLET = '<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>';

function todoIcon(state) {
  if (state === 'done') {
    return '<svg class="todo-check" width="14" height="14" viewBox="0 0 16 16" aria-label="已完成"><rect x="2" y="2" width="12" height="12" fill="#e8f5e9" stroke="#3f8f3f"/><path d="M4.5 8.5l2.5 2.5 4.5-5" fill="none" stroke="#3f8f3f" stroke-width="1.8"/></svg>';
  }
  if (state === 'doing') {
    return '<svg class="todo-check" width="14" height="14" viewBox="0 0 16 16" aria-label="进行中"><rect x="2" y="2" width="12" height="12" fill="#fff8e8" stroke="#c07818"/><path d="M8 4.5v4l2.5 1.5" fill="none" stroke="#c07818" stroke-width="1.6"/></svg>';
  }
  return '<svg class="todo-check pending" width="14" height="14" viewBox="0 0 16 16" aria-label="待做"><rect x="2" y="2" width="12" height="12" fill="none" stroke="#6b6b6b"/></svg>';
}

function statRows() {
  const rows = [
    { cls: 'done', label: '文章', key: 'posts', href: '/blog/' },
    { cls: 'doing', label: '作品', key: 'works', href: '/works/' },
    { cls: 'todo', label: '待办', key: 'todo_todo', href: '/todo/' }
  ];
  return oneLine(rows.map((r) => (
    `<div class="stat-row"><span class="stat-dot ${r.cls}"></span>` +
    `<span class="stat-label"><a href="${r.href}">${r.label}</a></span>` +
    `<strong>${num(r.key)}</strong></div>`
  )).join(''));
}

function recentPosts(limit, excludeCategory) {
  let list = allPosts();
  if (excludeCategory) {
    list = list.filter((p) => catsOf(p).indexOf(excludeCategory) < 0);
  }
  const items = list.slice(0, limit).map((p) => (
    `<li><a class="article-link" href="${href(p.path)}">` +
    `<span class="article-title">${esc(p.title)}</span>` +
    `<span class="article-meta">${fmtDate(p)} · ${esc(metaOf(p))}</span></a></li>`
  ));
  if (!items.length) return '<p class="xp-empty">还没有文章</p>';
  return oneLine(`<ul class="article-mini-list">${items.join('')}</ul>`);
}

function recentWorks(limit) {
  const posts = workPosts().filter((p) => p.thumbnail).slice(0, limit);
  const cards = posts.map((p, i) => (
    `<a class="recent-work-item${i === 0 ? ' featured' : ''}" href="${href(p.path)}">` +
    `<img class="recent-work-thumb" src="${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="480" height="360">` +
    `<div class="recent-work-info"><h4 class="recent-work-title">${esc(p.short_title || p.title)}</h4>` +
    `<p class="recent-work-date">${fmtDate(p)} · ${esc(metaOf(p))}</p></div></a>`
  ));
  if (!cards.length) return '<p class="xp-empty">还没有作品</p>';
  cards.push(
    `<a class="recent-work-item more" href="/works/">` +
    `<span class="more-works">查看全部<br><strong>${workPosts().length}</strong> 件作品 →</span></a>`
  );
  return oneLine(`<div class="recent-works-strip">${cards.join('')}</div>`);
}

function tagCloud(variant) {
  const tags = allTags();
  if (!tags.length) return '<p class="xp-empty">还没有标签</p>';
  if (variant === 'cloud') {
    const items = tags.map((t) => (
      `<a class="cloud-tag${t.length > 1 ? ' big' : ''}" href="${href(t.path)}" title="${t.length} 篇">${esc(t.name)}</a>`
    ));
    return oneLine(`<div class="tag-cloud">${items.join('')}</div>`);
  }
  const items = tags.map((t, i) => (
    `<a class="tag-pill ${PILL_CLASSES[i % PILL_CLASSES.length]}" href="${href(t.path)}">${esc(t.name)}` +
    `<span class="tag-count">${t.length}</span></a>`
  ));
  return oneLine(`<div class="tag-cloud">${items.join('')}</div>`);
}

function todoMini(limit) {
  const order = { doing: 0, todo: 1, done: 2 };
  const list = dataFile('todo').slice().sort((a, b) => {
    const sa = a.state || 'todo';
    const sb = b.state || 'todo';
    return order[sa] - order[sb];
  }).slice(0, limit);
  const items = list.map((t) => {
    const state = t.state || 'todo';
    return `<li>${todoIcon(state)}<span class="${state === 'done' ? 'done' : ''}">${esc(t.text)}</span></li>`;
  });
  return oneLine(`<ul class="todo-mini-list">${items.join('')}</ul>`);
}

function todoFull() {
  const groups = [
    { state: 'doing', label: '进行中', icon: 'icon-working' },
    { state: 'todo', label: '待做', icon: 'icon-todo' },
    { state: 'done', label: '已完成', icon: 'icon-done' }
  ];
  const list = dataFile('todo');
  const out = groups.map((g) => {
    const items = list.filter((t) => (t.state || 'todo') === g.state);
    const rows = items.map((t) => (
      `<li class="todo-item todo-${g.state}">` +
      `<span class="todo-checkbox">${todoIcon(g.state)}</span>` +
      `<span class="todo-text">${esc(t.text)}</span>` +
      (g.state === 'todo' ? '' : `<span class="todo-tag ${STATE_META[g.state].cls}">${STATE_META[g.state].label}</span>`) +
      `</li>`
    ));
    const body = rows.length ? `<ul class="todo-list">${rows.join('')}</ul>` : '<p class="xp-empty">这一栏还是空的</p>';
    return (
      `<div class="todo-item-section"><div class="xp-section-bar">` +
      `<svg width="18" height="18"><use href="#${g.icon}"/></svg><span>${g.label} (${items.length})</span></div></div>` +
      `<div class="todo-item-list">${body}</div>`
    );
  });
  return oneLine(out.join(''));
}

function appsGrid() {
  const apps = dataFile('apps');
  const groups = [
    { key: 'game', label: '小游戏', icon: 'icon-gamepad' },
    { key: 'tool', label: '小工具', icon: 'icon-wrench' }
  ];
  const out = groups.map((g) => {
    const items = apps.filter((a) => a.group === g.key);
    const cards = items.map((a) => {
      const online = a.status === 'online' && a.url;
      return (
        `<div class="games-item games-card">` +
        `<div class="app-card ${online ? 'is-link' : 'is-planned'}">` +
        `<div class="app-icon"><svg width="42" height="42" aria-hidden="true"><use href="#${a.icon}"/></svg></div>` +
        `<div class="app-info"><h4 class="app-title">${esc(a.name)}</h4><p class="app-desc">${esc(a.desc)}</p></div>` +
        (online
          ? `<a class="app-link" href="${esc(a.url)}" aria-label="${esc(a.name)}"></a>`
          : '<span class="xp-badge">开发中</span>') +
        `</div></div>`
      );
    }).join('');
    return (
      `<div class="games-item games-section-title"><div class="xp-section-bar">` +
      `<svg width="18" height="18" aria-hidden="true"><use href="#${g.icon}"/></svg>` +
      `<span>${g.label} (${items.length})</span></div></div>${cards}`
    );
  });
  if (!apps.length) return '<div class="games-item"><p class="xp-empty">清单还没有内容</p></div>';
  return oneLine(out.join(''));
}

function guidesList() {
  const groups = dataFile('guides');
  if (!groups.length) return '<div class="guides-item"><p class="xp-empty">清单还没有内容</p></div>';
  const out = groups.map((g) => {
    const items = (g.items || []).map((it) => {
      const online = it.status === 'online' && it.url;
      const title = online
        ? `<a class="guide-title" href="${esc(it.url)}">${esc(it.title)}</a>`
        : `<span class="guide-title is-planned" title="待撰写">${esc(it.title)}</span>`;
      return (
        `<li class="guide-item"><span class="guide-date">${esc(it.date || '')}</span>${title}` +
        (online ? '' : '<span class="xp-badge">待写</span>') +
        `<span class="guide-tag ${g.tag_class}">${esc(g.tag_text)}</span></li>`
      );
    }).join('');
    return (
      `<div class="guides-item guides-section-title"><div class="xp-section-bar">` +
      `<svg width="18" height="18" aria-hidden="true"><use href="#${g.icon}"/></svg>` +
      `<span>${esc(g.label)} (${(g.items || []).length})</span></div></div>` +
      `<div class="guides-item guides-list"><ul class="guide-list">${items}</ul></div>`
    );
  });
  return oneLine(out.join(''));
}

function workCards() {
  const posts = workPosts();
  if (!posts.length) return '<div class="works-item works-featured"><p class="xp-empty">还没有作品，先写一篇文章吧</p></div>';
  const out = posts.map((p, i) => {
    const cats = catsOf(p).filter((c) => c !== WORK_CATEGORY);
    const cat = cats[0] || '';
    const icon = CATEGORY_ICON[cat] || 'icon-palette';
    const thumb = p.thumbnail || p.img || '';
    const status = p.status === 'doing' ? 'doing' : 'done';
    const statusText = status === 'doing' ? '进行中' : '已完成';
    const meta = `${fmtDate(p)}<span class="work-status ${status}">${statusText}</span>`;
    const tagHtml = cats.map((c, idx) => `<span class="work-tag${idx === 0 ? ' category' : ''}">${esc(c)}</span>`).join('') +
      tagsOf(p).map((t) => `<span class="work-tag">${esc(t)}</span>`).join('');
    const titleBar =
      `<div class="xp-window-title"><span class="xp-window-title-text">` +
      `<svg class="inline-icon" width="12" height="12" aria-hidden="true"><use href="#${icon}"/></svg>` +
      `${esc(cat)}${i === 0 ? ' · 精选' : ''}</span>${BULLET}</div>`;
    if (i === 0) {
      return (
        `<div class="works-item works-featured" data-category="${esc(cat)}">` +
        `<a class="xp-window work-window-card featured" href="${href(p.path)}">${titleBar}` +
        `<div class="xp-window-body"><div class="work-featured-layout">` +
        `<div class="work-featured-thumb"><img src="${esc(thumb)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="480" height="360">` +
        `<div class="work-card-overlay"><span class="work-card-view">查看详情 <svg class="view-arrow" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div></div>` +
        `<div class="work-featured-info"><h3 class="work-featured-title">${esc(p.short_title || p.title)}</h3>` +
        `<p class="work-featured-desc">${esc(p.desc || '')}</p>` +
        `<div class="work-featured-meta"><span class="work-card-date">${meta}</span></div>` +
        `<div class="work-card-tags">${tagHtml}</div></div></div></div></a></div>`
      );
    }
    return (
      `<div class="works-item works-normal" data-category="${esc(cat)}">` +
      `<a class="xp-window work-window-card" href="${href(p.path)}">${titleBar}` +
      `<div class="xp-window-body"><div class="work-card-thumb"><img src="${esc(thumb)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="480" height="360">` +
      `<div class="work-card-overlay"><span class="work-card-view">查看详情 <svg class="view-arrow" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div></div>` +
      `<div class="work-card-info"><h4 class="work-card-title">${esc(p.short_title || p.title)}</h4>` +
      `<div class="work-card-meta"><span class="work-card-date">${meta}</span></div>` +
      `<div class="work-card-tags">${tagHtml}</div></div></div></a></div>`
    );
  });
  return oneLine(out.join(''));
}

function workFilters() {
  const cats = workCategories();
  const total = workPosts().length;
  const btns = [`<button type="button" class="filter-btn active" data-filter="all" aria-pressed="true">全部 (${total})</button>`]
    .concat(cats.map((c) => {
      const n = workPosts().filter((p) => catsOf(p).includes(c)).length;
      return `<button type="button" class="filter-btn" data-filter="${esc(c)}" aria-pressed="false">${esc(c)} (${n})</button>`;
    }));
  return oneLine(`<div class="filter-tags">${btns.join('')}</div>` +
    `<p class="filter-status" role="status" aria-live="polite" data-total="${total}">显示全部 ${total} 件作品</p>`);
}

/* ---------------------------------------------------------------- 搜索索引 */
/* 生成 /search.json，供首页搜索框在浏览器端匹配（替代原来指向 /blog/?q= 的死链） */
hexo.extend.generator.register('xp-search-index', () => {
  const strip = (html) => String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const posts = allPosts().map((p) => ({
    title: p.title,
    url: href(p.path),
    date: fmtDate(p),
    meta: metaOf(p),
    text: strip(p.content).slice(0, 600)
  }));
  return {
    path: 'search.json',
    data: JSON.stringify({ posts })
  };
});

/* ---------------------------------------------------------------- 播放器与便签 */
/* 曲目表：兼容两种写法
   - 纯列表（旧格式）：直接当作 tracks
   - 映射格式：{ tracks: [...], netease_playlist: <歌单id> } */
function musicData() {
  const raw = dataFile('music');
  if (Array.isArray(raw)) return { tracks: raw, netease: null };
  const tracks = Array.isArray(raw.tracks) ? raw.tracks : [];
  const id = raw.netease_playlist ? String(raw.netease_playlist).trim() : '';
  return { tracks, netease: id && id !== '0' ? id : null };
}

hexo.extend.tag.register('xp_music', () => {
  const { tracks, netease } = musicData();

  /* 模式 B：网易云歌单 —— 用官方外链播放器 iframe，不加载 APlayer */
  if (netease) {
    const src = '//music.163.com/outchain/player?type=0&id=' + encodeURIComponent(netease) + '&auto=0&height=430';
    return oneLine(
      '<script>window.XP_MUSIC = []; window.XP_MUSIC_EMBED = true;</script>' +
      '<div class="xp-music-embed"><iframe src="' + src + '" width="100%" height="100%" frameborder="0" ' +
      'loading="lazy" title="网易云音乐歌单播放器"></iframe></div>'
    );
  }

  /* 模式 A：自己的曲目 —— 只有真的填了曲目才加载 APlayer（省流量） */
  const config = `<script>window.XP_MUSIC = ${JSON.stringify(tracks)};</script>`;
  if (!tracks.length) return config;
  return oneLine(
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css">' +
    '<script src="https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js"></script>' + config
  );
});

/* 便签句子：从 source/_data/quotes.yml 读取，供首页脚本轮换 */
hexo.extend.tag.register('xp_quotes', () => {
  const raw = dataFile('quotes');
  const isList = Array.isArray(raw);
  const list = isList ? raw : (raw.quotes || []);
  const rotate = isList ? 0 : (Number(raw.rotate_seconds) || 0);
  return `<script>window.XP_QUOTES = ${JSON.stringify({ rotate, list })};</script>`;
});

/* ---------------------------------------------------------------- 侧栏 / 卡片 / 索引 片段 */
/* 这些 helper 供主题模板（themes/minimalism/layout/*.ejs）调用。
   把「组件长什么样」留在模板里、把「数据是什么」留在这里，
   这样站主改样式不用碰 JS，改数据不用碰模板。 */

const stripHtml = (html) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

/* 统一的侧栏卡片外壳（XP 窗口） */
function widget(title, body, extraClass) {
  if (!body) return '';
  return oneLine(
    `<div class="xp-window xp-widget ${extraClass || ''}">` +
    `<div class="xp-window-title"><span class="xp-window-title-text">${esc(title)}</span></div>` +
    `<div class="xp-window-body">${body}</div></div>`
  );
}

/* 卡片摘要：优先用 front matter 的 desc，其次取正文第一段。
   不要直接截取整篇正文 —— 会把代码块、小节标题（"作品简介"之类）混进来。 */
function excerptOf(post, len) {
  if (post.desc) {
    const d = String(post.desc).trim();
    return d.length > len ? d.slice(0, len) + '…' : d;
  }
  const html = String(post.content || post.excerpt || '');
  const firstP = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const text = stripHtml(firstP ? firstP[1] : html);
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function wordChip(ctx, post) {
  try {
    const wc = hexo.extend.helper.get('wordcount');
    if (!wc) return '';
    const n = wc.call(ctx || {}, post.content);
    if (!n) return '';
    return `<span class="xp-chip">${n} 字</span>`;
  } catch (err) {
    return '';
  }
}

hexo.extend.helper.register('xp_widget_author', function () {
  const cfg = hexo.config;
  const body = oneLine(
    `<div class="xp-aside-author">` +
    `<img src="/images/site-avatar.png" alt="${esc(cfg.author || cfg.title)}" width="256" height="256" loading="lazy" decoding="async">` +
    `<div class="name">${esc(cfg.author || cfg.title)}</div>` +
    `<div class="bio">${esc(cfg.description || '')}</div>` +
    `<div class="links">` +
    `<a class="xp-btn xp-btn-small" href="/about/">关于我</a>` +
    `<a class="xp-btn xp-btn-small" href="/works/">作品集</a>` +
    `<a class="xp-btn xp-btn-small" href="/blog/">全部文章</a>` +
    `</div></div>`
  );
  return widget('关于我', body);
});

hexo.extend.helper.register('xp_widget_recent', (n) => widget('最近文章', recentPosts(n || 6)));
hexo.extend.helper.register('xp_widget_tags', () => widget('标签云', tagCloud('pill')));
hexo.extend.helper.register('xp_widget_stats', () => widget('小站数据', statRows()));
hexo.extend.helper.register('xp_widget_todo', (n) => widget('待办清单', todoMini(n || 5)));
hexo.extend.helper.register('xp_meta', (post) => metaOf(post));
hexo.extend.helper.register('xp_words', function (post) { return wordChip(this, post); });
hexo.extend.helper.register('xp_widget_browse', () => widget('浏览', oneLine(
  `<div class="quick-nav-grid">` +
  `<a class="nav-tile" href="/blog/"><span>全部文章</span></a>` +
  `<a class="nav-tile" href="/archives/"><span>归档</span></a>` +
  `<a class="nav-tile" href="/tags/"><span>标签</span></a>` +
  `<a class="nav-tile" href="/categories/"><span>分类</span></a>` +
  `<a class="nav-tile" href="/works/"><span>作品</span></a>` +
  `<a class="nav-tile" href="/about/"><span>关于</span></a>` +
  `</div>`
)));

/* 目录：用 Hexo 自带的 toc helper 生成，class 前缀设成 xp-toc 以复用我们的样式 */
hexo.extend.helper.register('xp_widget_toc', function (content) {
  const tocHelper = hexo.extend.helper.get('toc');
  if (!tocHelper || !content) return '';
  let html = '';
  try {
    html = tocHelper.call(this, content, { list_number: false, max_depth: 3, class: 'xp-toc' });
  } catch (err) {
    return '';
  }
  if (!html || html.indexOf('<li') < 0) return '';
  return widget('目录', html, 'xp-widget-toc');
});

/* 相关文章：优先同分类，其次同标签 */
hexo.extend.helper.register('xp_related', function (page, n) {
  const limit = n || 3;
  const cats = catsOf(page);
  const tags = tagsOf(page);
  const scored = allPosts()
    .filter((p) => p.path !== page.path)
    .map((p) => {
      let score = 0;
      catsOf(p).forEach((c) => { if (cats.indexOf(c) >= 0) score += 3; });
      tagsOf(p).forEach((t) => { if (tags.indexOf(t) >= 0) score += 2; });
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.date - a.p.date))
    .slice(0, limit);
  if (!scored.length) return '';
  const items = scored.map(({ p }) => (
    `<li><a href="${href(p.path)}">${esc(p.title)}` +
    `<span class="meta">${fmtDate(p)} · ${esc(metaOf(p))}</span></a></li>`
  ));
  return oneLine(`<div class="xp-window xp-widget xp-related">` +
    `<div class="xp-window-title"><span class="xp-window-title-text">相关文章</span></div>` +
    `<div class="xp-window-body"><ul class="xp-related-list">${items.join('')}</ul></div></div>`);
});

/* 文章卡片流（杂谈列表页 / 标签页共用） */
hexo.extend.helper.register('xp_post_cards', function (posts) {
  const list = q2a(posts);
  if (!list.length) return '<p class="xp-empty">这里还没有文章</p>';
  const cards = list.map((p) => {
    const cover = p.thumbnail || p.img;
    return oneLine(
      `<a class="xp-post-card" href="${href(p.path)}">` +
      (cover ? `<span class="xp-post-card-cover"><img src="${esc(cover)}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="480" height="320"></span>` : '') +
      `<span class="xp-post-card-body">` +
      `<h2 class="xp-post-card-title">${esc(p.title)}</h2>` +
      `<span class="xp-post-card-excerpt">${esc(excerptOf(p, 96))}</span>` +
      `<span class="xp-post-card-meta">` +
      `<span class="xp-chip">${fmtDate(p)}</span>` +
      `<span class="xp-chip primary">${esc(metaOf(p))}</span>` +
      wordChip(this, p) +
      `</span></span></a>`
    );
  });
  return oneLine(`<div class="xp-card-list">${cards.join('')}</div>`);
});

/* 标签 / 分类索引页（同时注册成 helper 与 markdown 标签，两处复用同一份实现） */
function tagIndexHtml() {
  const tags = allTags();
  if (!tags.length) return '<p class="xp-empty">还没有标签</p>';
  const items = tags.map((t) => (
    `<a class="xp-index-item" href="${href(t.path)}"><span class="name">${esc(t.name)}</span>` +
    `<span class="count">${t.length} 篇</span></a>`
  ));
  return oneLine(`<div class="xp-index-grid">${items.join('')}</div>`);
}

function categoryIndexHtml() {
  const cats = allCategories().slice().sort((a, b) => b.length - a.length);
  if (!cats.length) return '<p class="xp-empty">还没有分类</p>';
  const items = cats.map((c) => (
    `<a class="xp-index-item" href="${href(c.path)}"><span class="name">${esc(c.name)}</span>` +
    `<span class="count">${c.length} 篇</span></a>`
  ));
  return oneLine(`<div class="xp-index-grid">${items.join('')}</div>`);
}

hexo.extend.helper.register('xp_tag_index', () => tagIndexHtml());
hexo.extend.helper.register('xp_category_index', () => categoryIndexHtml());
registerTag('xp_tag_index', () => tagIndexHtml());
registerTag('xp_category_index', () => categoryIndexHtml());

/* ---------------------------------------------------------------- 注册 */
function registerTag(name, fn) {
  hexo.extend.tag.register(name, function (args) {
    return fn(args || []);
  });
}

registerTag('xp_num', (args) => String(num(args[0])));
registerTag('xp_stat_rows', () => statRows());
registerTag('xp_recent_posts', (args) => {
  const limit = parseInt(args[0], 10) || 4;
  const exclude = String(args[1] || '').replace(/^exclude=/, '');
  return recentPosts(limit, exclude || null);
});
registerTag('xp_recent_works', (args) => recentWorks(parseInt(args[0], 10) || 3));
registerTag('xp_tag_cloud', (args) => tagCloud(args[0]));
registerTag('xp_todo', (args) => (args[0] === 'full' ? todoFull() : todoMini(parseInt(args[0], 10) || 4)));
registerTag('xp_apps', () => appsGrid());
registerTag('xp_guides', () => guidesList());
registerTag('xp_work_cards', () => workCards());
registerTag('xp_work_filters', () => workFilters());

/* 供注入器 / 过滤器复用（/blog/ 的待办窗口、文章页窗口按钮） */
hexo.extend.helper.register('xp_todo_mini', (limit) => todoMini(limit || 4));
hexo.extend.helper.register('xp_todo_full', () => todoFull());
hexo.extend.helper.register('xp_bullet', () => BULLET);
hexo.extend.helper.register('xp_num_of', (key) => num(key));
