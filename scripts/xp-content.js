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
 *   {% xp_todo 4 %}                     待办清单（4=只显示前 4 条；0 或省略=显示全部）
 *   {% xp_apps %}                        游戏/工具卡片（含分组标题条）
 *   {% xp_guides %}                      攻略/教程分组列表
 *   {% xp_work_gallery %}                作品页：原创/同人分栏 + 时间轴 + 标签筛选 + 原地展开
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
  /* 待办行不再链到独立页面（该页已删除），只作为数字展示；想看清单去杂谈页 */
  const rows = [
    { cls: 'done', label: '文章', key: 'posts', href: '/blog/' },
    { cls: 'doing', label: '作品', key: 'works', href: '/works/' },
    { cls: 'todo', label: '待办', key: 'todo_todo' }
  ];
  return oneLine(rows.map((r) => (
    `<div class="stat-row"><span class="stat-dot ${r.cls}"></span>` +
    `<span class="stat-label">${r.href ? `<a href="${r.href}">${r.label}</a>` : r.label}</span>` +
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

/* limit <= 0 表示"不限条数"（清单现在只出现在杂谈页，默认显示全部） */
function todoMini(limit) {
  const order = { doing: 0, todo: 1, done: 2 };
  const sorted = dataFile('todo').slice().sort((a, b) => {
    const sa = a.state || 'todo';
    const sb = b.state || 'todo';
    return order[sa] - order[sb];
  });
  const list = limit > 0 ? sorted.slice(0, limit) : sorted;
  const items = list.map((t) => {
    const state = t.state || 'todo';
    return `<li>${todoIcon(state)}<span class="${state === 'done' ? 'done' : ''}">${esc(t.text)}</span></li>`;
  });
  return oneLine(`<ul class="todo-mini-list">${items.join('')}</ul>`);
}

/* 全量三栏视图（todoFull）已随 /todo/ 页一并删除：
   待办清单现在只出现在杂谈页一处，显示全部条目并按 进行中 → 待做 → 已完成 排序。 */

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

/* ---------------------------------------------------------------- 作品集（分栏目 + 时间轴 + 筛选） */
/* 时间轴分期：想改分期就改这里。from 含、to 不含；最后一档 to: null 表示"至今"。
   "最新的一档"会默认展开，其余默认折叠（点击展开）。 */
const WORK_ERAS = [
  { label: '远古期', from: '0000-01-01', to: '2024-01-01' },
  { label: '2024 年', from: '2024-01-01', to: '2025-01-01' },
  { label: '2025 年', from: '2025-01-01', to: '2026-01-01' },
  { label: '2026 年上半年', from: '2026-01-01', to: '2026-06-01' },
  { label: '2026 年 6-10 月', from: '2026-06-01', to: null }
];

const WORK_ORIGINS = ['原创', '同人'];

/* 栏目：文章里写 origin: 同人，没写就当原创 */
function workOrigin(post) {
  const raw = String(post.origin || '').trim();
  return WORK_ORIGINS.indexOf(raw) >= 0 ? raw : WORK_ORIGINS[0];
}

/* 分期：文章里写 era: 2025 年 可以手动覆盖，否则按日期自动归入 */
function workEraLabel(post) {
  const override = String(post.era || '').trim();
  if (override) return override;
  const t = new Date(post.date).getTime();
  for (let i = 0; i < WORK_ERAS.length; i += 1) {
    const era = WORK_ERAS[i];
    const from = new Date(era.from + 'T00:00:00').getTime();
    const to = era.to ? new Date(era.to + 'T00:00:00').getTime() : Infinity;
    if (t >= from && t < to) return era.label;
  }
  return WORK_ERAS[WORK_ERAS.length - 1].label;
}

function eraOrder(label) {
  const idx = WORK_ERAS.map((e) => e.label).indexOf(label);
  if (idx >= 0) return idx;
  const year = parseInt(String(label).replace(/[^\d]/g, '').slice(0, 4), 10);
  return Number.isFinite(year) ? 100 + year : 9999;   /* 自定义 label 排在预置分期之后 */
}

function workCardHtml(post) {
  const tags = tagsOf(post);
  const cats = catsOf(post).filter((c) => c !== WORK_CATEGORY);
  const thumb = post.thumbnail || post.img || '';
  const statusText = post.status === 'doing' ? '进行中' : '已完成';
  const title = post.short_title || post.title;
  const tagButtons = tags.map((t) => (
    `<button type="button" class="work-tag" data-tag="${esc(t)}" title="只看「${esc(t)}」">${esc(t)}</button>`
  )).join('');
  const catChips = cats.map((c) => `<span class="work-cat">${esc(c)}</span>`).join('');
  const body = '';
  return (
    `<article class="work-card" data-tags="${esc(tags.join(' '))}" data-era="${esc(workEraLabel(post))}" data-origin="${esc(workOrigin(post))}">` +
    `<a class="work-thumb" href="${href(post.path)}">` +
    (thumb ? `<img src="${esc(thumb)}" alt="${esc(title)}" loading="lazy" decoding="async" width="480" height="360">` : '') +
    `<span class="work-status ${post.status === 'doing' ? 'doing' : 'done'}">${statusText}</span>` +
    `</a>` +
    `<div class="work-card-body">` +
    `<h3 class="work-card-title"><a href="${href(post.path)}">${esc(title)}</a></h3>` +
    `<div class="work-card-meta"><span class="work-card-date">${fmtDate(post)}</span>${catChips}</div>` +
    (tagButtons ? `<div class="work-card-tags">${tagButtons}</div>` : '') +
    /* 正文不在这里内联：源码页面渲染时文章的 content 还没写入（Hexo 的处理顺序），
       改由 works-bodies.json 按需加载，见 xp-work-bodies 生成器与下面的脚本 */
    `<div class="work-card-full" hidden data-work="${esc(post.path)}">${body}</div>` +
    `</div>` +
    `<div class="work-card-foot"><button type="button" class="work-expand" aria-expanded="false">展开全文</button></div>` +
    `</article>`
  );
}

function workGallery() {
  const posts = workPosts();
  if (!posts.length) return '<p class="xp-empty">还没有作品，先写一篇文章吧</p>';

  /* 标签统计（用于筛选条） */
  const tagCount = {};
  posts.forEach((p) => tagsOf(p).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const tags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]);

  const tabs = WORK_ORIGINS.map((o, i) => {
    const n = posts.filter((p) => workOrigin(p) === o).length;
    return `<button type="button" class="work-tab${i === 0 ? ' is-active' : ''}" data-origin="${esc(o)}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}">${esc(o)} <span class="tab-count">${n}</span></button>`;
  }).join('');

  const pills = tags.map((t) => (
    `<button type="button" class="filter-pill" data-tag="${esc(t)}" aria-pressed="false">${esc(t)} <span class="pill-count">${tagCount[t]}</span></button>`
  )).join('');

  const panes = WORK_ORIGINS.map((origin) => {
    const mine = posts.filter((p) => workOrigin(p) === origin);
    /* 按分期分组，分期从新到旧，最新的一档默认展开 */
    const groups = {};
    mine.forEach((p) => {
      const label = workEraLabel(p);
      (groups[label] = groups[label] || []).push(p);
    });
    const labels = Object.keys(groups).sort((a, b) => eraOrder(b) - eraOrder(a));
    const eras = labels.map((label, idx) => (
      `<details class="work-era"${idx === 0 ? ' open' : ''}>` +
      `<summary class="work-era-bar"><span class="era-name">${esc(label)}</span>` +
      `<span class="era-count">${groups[label].length} 件</span></summary>` +
      `<div class="work-grid">${groups[label].sort((a, b) => new Date(b.date) - new Date(a.date)).map(workCardHtml).join('')}</div>` +
      `</details>`
    )).join('');
    return (
      `<div class="work-pane${origin === WORK_ORIGINS[0] ? ' is-active' : ''}" data-origin="${esc(origin)}" role="tabpanel"${origin === WORK_ORIGINS[0] ? '' : ' hidden'}>` +
      (eras || '<p class="xp-empty">这个栏目还没有作品</p>') +
      `</div>`
    );
  }).join('');

  const toolbar =
    `<div class="work-toolbar">` +
    `<div class="work-tabs" role="tablist" aria-label="作品栏目">${tabs}</div>` +
    `<div class="work-filter-bar">` +
    `<span class="filter-label">标签筛选</span>${pills}` +
    `<label class="filter-block"><input type="checkbox" id="work-block-mode"> 屏蔽模式</label>` +
    `<button type="button" class="filter-clear" id="work-filter-clear">清除筛选</button>` +
    `</div>` +
    `<p class="filter-status" id="work-filter-status" role="status" aria-live="polite">共 ${posts.length} 件作品</p>` +
    `</div>`;

  const script = oneLine(
    `<script>(function(){` +
    `var root=document.querySelector('.work-gallery');if(!root)return;` +
    `var tabs=root.querySelectorAll('.work-tab');` +
    `var panes=root.querySelectorAll('.work-pane');` +
    `var pills=root.querySelectorAll('.filter-pill');` +
    `var mode=root.querySelector('#work-block-mode');` +
    `var clearBtn=root.querySelector('#work-filter-clear');` +
    `var status=root.querySelector('#work-filter-status');` +
    `var activeTags=[];` +
    `function pane(){for(var i=0;i<panes.length;i++){if(!panes[i].hidden)return panes[i];}return null;}` +
    `function apply(){` +
    `var p=pane();if(!p)return;var cards=p.querySelectorAll('.work-card');var shown=0;var blocked=(mode&&mode.checked);` +
    `for(var i=0;i<cards.length;i++){var c=cards[i];var list=(c.getAttribute('data-tags')||'').split(' ').filter(Boolean);` +
    `var hit=activeTags.length===0?false:activeTags.some(function(t){return list.indexOf(t)>=0;});` +
    `var hide=activeTags.length===0?false:(blocked?hit:!hit);` +
    `c.hidden=hide;if(!hide)shown++;}` +
    `var eras=p.querySelectorAll('.work-era');` +
    `for(var e=0;e<eras.length;e++){var any=false;var cs=eras[e].querySelectorAll('.work-card');` +
    `for(var k=0;k<cs.length;k++){if(!cs[k].hidden){any=true;break;}}eras[e].hidden=!any;if(any&&activeTags.length)eras[e].open=true;}` +
    `if(status){status.textContent=activeTags.length===0?('共 '+cards.length+' 件作品'):((blocked?'已屏蔽':'只看')+'「'+activeTags.join('、')+'」：'+shown+' 件');}` +
    `}` +
    `for(var i=0;i<tabs.length;i++){(function(btn){btn.addEventListener('click',function(){` +
    `for(var j=0;j<tabs.length;j++){tabs[j].classList.toggle('is-active',tabs[j]===btn);tabs[j].setAttribute('aria-selected',tabs[j]===btn?'true':'false');}` +
    `for(var k=0;k<panes.length;k++){panes[k].hidden=panes[k].getAttribute('data-origin')!==btn.getAttribute('data-origin');}` +
    `activeTags=[];for(var m=0;m<pills.length;m++){pills[m].classList.remove('is-active');pills[m].setAttribute('aria-pressed','false');}` +
    `apply();});})(tabs[i]);}` +
    `for(var i=0;i<pills.length;i++){(function(btn){btn.addEventListener('click',function(){` +
    `var t=btn.getAttribute('data-tag');var idx=activeTags.indexOf(t);` +
    `if(idx>=0){activeTags.splice(idx,1);btn.classList.remove('is-active');btn.setAttribute('aria-pressed','false');}` +
    `else{activeTags.push(t);btn.classList.add('is-active');btn.setAttribute('aria-pressed','true');}` +
    `apply();});})(pills[i]);}` +
    `if(mode){mode.addEventListener('change',apply);}` +
    `if(clearBtn){clearBtn.addEventListener('click',function(){activeTags=[];` +
    `for(var i=0;i<pills.length;i++){pills[i].classList.remove('is-active');pills[i].setAttribute('aria-pressed','false');}` +
    `if(mode){mode.checked=false;}apply();});}` +
    `root.addEventListener('click',function(ev){` +
    `var tagBtn=ev.target.closest?ev.target.closest('.work-tag'):null;` +
    `if(tagBtn){var t=tagBtn.getAttribute('data-tag');` +
    `for(var i=0;i<pills.length;i++){if(pills[i].getAttribute('data-tag')===t){pills[i].click();break;}}return;}` +
    `var ex=ev.target.closest?ev.target.closest('.work-expand'):null;` +
    `if(!ex)return;var card=ex.closest('.work-card');var full=card?card.querySelector('.work-card-full'):null;if(!full)return;` +
    `if(!full.hidden){full.hidden=true;ex.textContent='展开全文';ex.setAttribute('aria-expanded','false');return;}` +
    `var key=full.getAttribute('data-work');` +
    `function open(d){if(d&&!full.innerHTML.trim()){full.innerHTML=d[key]||'<p class="xp-empty">这篇没有正文</p>';}` +
    `full.hidden=false;ex.textContent='收起';ex.setAttribute('aria-expanded','true');}` +
    `if(full.innerHTML.trim()){open(null);return;}` +
    `ex.textContent='加载中…';` +
    `if(xpBodies){open(xpBodies);return;}` +
    `fetch('/works-bodies.json').then(function(r){return r.json();}).then(function(d){xpBodies=d;open(d);})` +
    `.catch(function(){xpBodies={};open(xpBodies);});` +
    `});` +
    `var xpBodies=null;` +
    `apply();` +   /* 首次也走一遍：让状态栏数字与当前栏目一致 */
    `})();</script>`
  );

  return oneLine(`<div class="work-gallery">${toolbar}${panes}</div>` + script);
}

/* ---------------------------------------------------------------- 作品正文（按需加载） */
/* 作品页的「展开全文」需要文章正文，但源码页面渲染时文章的 content 还没写入，
   所以由生成器在全部处理完成之后输出 /works-bodies.json，页面点开时才去取。
   好处：作品页初始体积不随作品数量增长。 */
hexo.extend.generator.register('xp-work-bodies', () => {
  const bodies = {};
  workPosts().forEach((p) => {
    bodies[p.path] = String(p.content || '');
  });
  return {
    path: 'works-bodies.json',
    data: JSON.stringify(bodies)
  };
});

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
/* 曲目表来源，按优先级：
   - source/_data/music.yml 的 tracks（手工填的曲目）
   - source/_data/music-tracks.yml（tools/fetch-netease.py 从网易云歌单生成）
   - 都没有、但有 netease_playlist 时才退回网易云官方外链播放器
   （纯列表格式的老写法也兼容） */
function musicData() {
  const raw = dataFile('music') || {};
  const gen = dataFile('music-tracks');
  const genTracks = Array.isArray(gen) ? gen : (gen && Array.isArray(gen.tracks) ? gen.tracks : []);
  const ownTracks = Array.isArray(raw) ? raw : (Array.isArray(raw.tracks) ? raw.tracks : []);
  const tracks = ownTracks.length ? ownTracks : genTracks;
  const id = !Array.isArray(raw) && raw.netease_playlist ? String(raw.netease_playlist).trim() : '';
  return { tracks, netease: tracks.length ? null : (id && id !== '0' ? id : null) };
}

/* 播放器界面上的文案（music.yml 可改） */
function musicUi() {
  const raw = dataFile('music') || {};
  const cfg = Array.isArray(raw) ? {} : raw;
  return {
    title: String(cfg.player_title || 'XP-MP4'),
    empty: String(cfg.player_empty_text || '未配置曲目')
  };
}

hexo.extend.tag.register('xp_music_title', () => esc(musicUi().title));

hexo.extend.tag.register('xp_music', () => {
  const { tracks, netease } = musicData();

  /* 模式 B：网易云歌单 —— 用官方外链播放器 iframe，不加载 APlayer */
  if (netease) {
    const src = '//music.163.com/outchain/player?type=0&id=' + encodeURIComponent(netease) + '&auto=0&height=430';
    return oneLine(
      '<script>window.XP_MUSIC = []; window.XP_MUSIC_EMBED = true;' +
        `window.XP_MUSIC_UI = ${JSON.stringify(musicUi())};</script>` +
      '<div class="xp-music-embed"><iframe src="' + src + '" width="100%" height="100%" frameborder="0" ' +
      'loading="lazy" title="网易云音乐歌单播放器"></iframe></div>'
    );
  }

  /* 模式 A：自己的曲目 —— 只有真的填了曲目才加载 APlayer（省流量） */
  const config = `<script>window.XP_MUSIC = ${JSON.stringify(tracks)};</script>`;
  if (!tracks.length) return config;
  return oneLine(
    '<link rel="stylesheet" href="/vendor/aplayer/APlayer.min.css">' +
    '<script src="/vendor/aplayer/APlayer.min.js"></script>' + config
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
  const p = profileData();
  const names = profileNames();
  const name = names[0] || p.name || cfg.author || cfg.title;
  const bio = p.bio || cfg.description || '';
  const avatar = p.avatar || '/images/site-avatar.png';
  const body = oneLine(
    `<div class="xp-aside-author">` +
    `<img src="${esc(avatar)}" alt="${esc(name)}" width="256" height="256" loading="lazy" decoding="async">` +
    `<div class="name">${esc(name)}</div>` +
    `<div class="bio">${esc(bio)}</div>` +
    `<div class="links">` +
    `<a class="xp-btn xp-btn-small" href="/#about">关于本站</a>` +
    `<a class="xp-btn xp-btn-small" href="/works/">作品集</a>` +
    `<a class="xp-btn xp-btn-small" href="/blog/">全部文章</a>` +
    `</div></div>`
  );
  return widget('关于我', body);
});

hexo.extend.helper.register('xp_widget_recent', (n) => widget('最近文章', recentPosts(n || 6)));
hexo.extend.helper.register('xp_widget_tags', () => widget('标签云', tagCloud('pill')));
hexo.extend.helper.register('xp_widget_stats', () => widget('小站数据', statRows()));
hexo.extend.helper.register('xp_widget_todo', (n) => widget('待办清单', todoMini(n == null ? 5 : n)));
hexo.extend.helper.register('xp_meta', (post) => metaOf(post));
hexo.extend.helper.register('xp_words', function (post) { return wordChip(this, post); });
hexo.extend.helper.register('xp_widget_browse', () => widget('浏览', oneLine(
  `<div class="quick-nav-grid">` +
  `<a class="nav-tile" href="/blog/"><span>全部文章</span></a>` +
  `<a class="nav-tile" href="/archives/"><span>归档</span></a>` +
  `<a class="nav-tile" href="/tags/"><span>标签</span></a>` +
  `<a class="nav-tile" href="/categories/"><span>分类</span></a>` +
  `<a class="nav-tile" href="/works/"><span>作品</span></a>` +
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

/* ---------------------------------------------------------------- 身份信息（profile.yml） */
/* 名字、介绍、按钮、联系方式都从这里读，页面里只放 {% xp_profile … %} 标签。
   支持点号路径，例如 {% xp_profile about.title %}。 */
function profileData() {
  const raw = dataFile('profile');
  return Array.isArray(raw) ? {} : (raw || {});
}

function profileValue(key) {
  return String(key || '').split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), profileData());
}

/* 胶囊：既支持 { key: works, label: 作品 }（数字由站点统计），
   也支持 { value: "∞", label: 灵感 }，以及 about.chips 里那种纯字符串 */
function profileChips(list) {
  if (!Array.isArray(list) || !list.length) return '';
  return oneLine(list.map((c) => {
    if (typeof c === 'string') {
      return `<span class="meta-chip"><strong>${esc(c)}</strong></span>`;
    }
    const value = c.key ? String(num(c.key)) : String(c.value == null ? '' : c.value);
    return `<span class="meta-chip"><strong>${esc(value)}</strong>${c.label ? ' ' + esc(c.label) : ''}</span>`;
  }).join(''));
}

function profileParagraphs(list) {
  if (!Array.isArray(list) || !list.length) return '';
  return oneLine(list.map((t) => `<p>${esc(t)}</p>`).join(''));
}

/* 首页大标题用的网名：profile.yml 的 names 列表（第一个兼作主名）。
   没配 names 就退回旧的单个 name / 站点作者。 */
function profileNames() {
  const p = profileData();
  const raw = p.names;
  let list = [];
  if (Array.isArray(raw)) list = raw.map((x) => String(x == null ? '' : x).trim()).filter(Boolean);
  else if (raw) list = [String(raw).trim()];
  if (list.length) return list;
  const single = p.name || hexo.config.author || hexo.config.title || '';
  return single ? [String(single).trim()] : [];
}

hexo.extend.tag.register('xp_profile', (args) => {
  const key = args[0];
  if (key === 'name') {
    const list = profileNames();
    return list.length ? esc(list[0]) : '';
  }
  const v = profileValue(key);
  return v == null ? '' : esc(v);
});

/* 首页大标题整体：「<网名> 来了！」；多个网名时附带轮换配置（脚本在页面底部统一处理） */
hexo.extend.tag.register('xp_profile_title', () => {
  const list = profileNames();
  const suffix = profileValue('name_suffix') || '来了！';
  const rotate = Number(profileValue('name_rotate_seconds')) || 0;
  const cfg = (list.length > 1 || rotate > 0)
    ? `<script>window.XP_NAMES = ${JSON.stringify({ list, rotate })};</script>`
    : '';
  return oneLine(`<span class="username" id="xpName">${esc(list[0] || '')}</span> ${esc(suffix)}${cfg}`);
});

/* 段落列表：{% xp_profile_lines intro %} 或 {% xp_profile_lines about.paragraphs %} */
hexo.extend.tag.register('xp_profile_lines', (args) => {
  const key = args[0] || 'intro';
  const v = profileValue(key);
  const list = Array.isArray(v) ? v : (v ? [v] : []);
  if (key === 'intro') {
    const tagline = profileValue('tagline');
    if (tagline) list.unshift(tagline);
  }
  return profileParagraphs(list);
});

hexo.extend.tag.register('xp_profile_chips', (args) => profileChips(profileValue(args[0] || 'chips')));

hexo.extend.tag.register('xp_profile_buttons', () => oneLine(
  (profileData().buttons || [])
    .map((b) => `<a class="xp-btn" href="${esc(b.url || '#')}">${esc(b.text || '')}</a>`)
    .join('')
));

/* 只渲染填了内容的联系方式 */
hexo.extend.tag.register('xp_profile_contacts', () => {
  const contacts = profileData().contacts || {};
  const labels = { github: 'GitHub', email: '邮箱' };
  return oneLine(Object.keys(labels).filter((k) => contacts[k]).map((k) => {
    const url = k === 'email' ? `mailto:${contacts[k]}` : contacts[k];
    return `<a class="xp-btn" href="${esc(url)}" target="_blank" rel="noopener">${labels[k]}</a>`;
  }).join(''));
});

/* 首页图标行的图标（内联 SVG，不依赖任何外部图标库/CDN） */
const PROFILE_ICONS = {
  github: {
    label: 'GitHub',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.6.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2.1 1-2.8-.1-.3-.4-1.3.1-2.7 0 0 .9-.3 2.8 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.7 1 2.8 0 4-2.4 4.8-4.6 5.1.4.4.7 1 .7 2v2.9c0 .3.2.6.7.5A10.2 10.2 0 0 0 22 12.2C22 6.6 17.5 2 12 2z" fill="currentColor"/></svg>'
  },
  email: {
    label: '邮箱',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 7.5l8.5 5.5 8.5-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  },
  bilibili: {
    label: '哔哩哔哩',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="7" width="19" height="12.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 3.5l2.8 2.8M16.5 3.5l-2.8 2.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8.6" cy="13" r="1.4" fill="currentColor"/><circle cx="15.4" cy="13" r="1.4" fill="currentColor"/></svg>'
  },
  xiaohongshu: {
    label: '小红书',
    /* 蓝底白字，和图标行里其他图标同一个 XP 蓝；20px 下也能认出来 */
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4" fill="#0054e3"/><text x="12" y="16.8" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="12.5" font-weight="bold" fill="#ffffff">书</text></svg>'
  },
  x: {
    label: 'X',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 3h4.2l4.3 5.7L17.2 3h3.3l-6.6 8 6.9 10h-4.2l-4.7-6.2L6.4 21H3.1l7-8.5L3.5 3z" fill="currentColor"/></svg>'
  },
  weibo: {
    label: '微博',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="11" cy="13" rx="8.5" ry="6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="11" cy="13" r="2.8" fill="currentColor"/><path d="M18 5.5c1.6 0 3 1.4 3 3.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  },
  pixiv: {
    label: 'Pixiv',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 17.5V6.5h3.6a3.4 3.4 0 0 1 0 6.8H9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>'
  },
  website: {
    label: '个人站点',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c3.2 3.3 3.2 14.7 0 18M12 3c-3.2 3.3-3.2 14.7 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
  }
};

/* 邮箱：支持单个字符串，也支持列表。列表项四种写法都认：
     - me@example.com                    纯地址
     - 个人：me@example.com              字符串里带标签（全角/半角冒号都行）
     - { 个人: me@example.com }          YAML 映射
     - { label: 个人, address: me@x.com } */
function profileEmails() {
  const raw = (profileData().contacts || {}).email;
  const out = [];
  const push = (label, address) => {
    let a = String(address == null ? '' : address).trim();
    let l = String(label || '').trim();
    if (!l && a) {
      const m = a.match(/^([^:：]{1,14})[:：]\s*(.+)$/);
      if (m) { l = m[1].trim(); a = m[2].trim(); }
    }
    if (a) out.push({ label: l, address: a });
  };
  const pushObject = (obj) => {
    const keys = Object.keys(obj);
    if (obj.address) {                       /* { label: 个人, address: xxx } */
      push(obj.label || '', obj.address);
    } else {                                 /* { 个人: xxx, 工作: yyy } */
      keys.forEach((k) => push(k, obj[k]));
    }
  };
  if (Array.isArray(raw)) {
    raw.forEach((it) => {
      if (typeof it === 'string') push('', it);
      else if (it && typeof it === 'object') pushObject(it);
    });
  } else if (raw && typeof raw === 'object') {
    pushObject(raw);
  } else {
    push('', raw);
  }
  return out;
}

/* 只渲染 profile.yml 里填了地址的平台。
   邮箱：只有一个地址时，图标直接就是 mailto 链接；
        有多个地址时，点击图标弹出一个列出所有地址的小窗（见 xp-enhance.js）。 */
hexo.extend.tag.register('xp_profile_icons', () => {
  const contacts = profileData().contacts || {};
  const emails = profileEmails();
  const html = Object.keys(PROFILE_ICONS).filter((k) => {
    if (k === 'email') return emails.length > 0;
    return Boolean(contacts[k]);
  }).map((k) => {
    const icon = PROFILE_ICONS[k];
    if (k === 'email') {
      const tip = emails.length > 1 ? `邮箱（共 ${emails.length} 个，点击查看）` : icon.label;
      return `<a class="profile-icon" href="mailto:${esc(emails[0].address)}" id="xpEmailBtn" ` +
        `aria-haspopup="${emails.length > 1 ? 'dialog' : 'false'}" aria-expanded="false" ` +
        `title="${esc(tip)}" aria-label="${esc(icon.label)}">${icon.svg}</a>`;
    }
    return `<a class="profile-icon" href="${esc(contacts[k])}" target="_blank" rel="noopener" ` +
      `title="${icon.label}" aria-label="${icon.label}">${icon.svg}</a>`;
  });

  /* 多个邮箱时附带一个隐藏的小窗 + 弹出逻辑（定位用 fixed，避免被窗口的 overflow 裁掉） */
  if (emails.length > 1) {
    const hint = profileValue('about.contact_desc');
    const items = emails.map((e) => (
      `<a class="pop-email" href="mailto:${esc(e.address)}">` +
      (e.label ? `<span class="email-label">${esc(e.label)}</span>` : '') +
      `<span class="email-address">${esc(e.address)}</span></a>`
    ));
    html.push(
      `<div class="profile-email-pop" id="xpEmailPop" role="dialog" aria-label="邮箱地址" hidden>` +
      `<div class="pop-title"><span>邮箱</span>` +
      `<button type="button" class="pop-close" aria-label="关闭">×</button></div>` +
      `<div class="pop-body">` +
      (hint ? `<p class="pop-hint">${esc(hint)}</p>` : '') +
      items.join('') +
      `</div></div>`
    );
    html.push(oneLine(
      '<script>(function(){' +
      'var b=document.getElementById("xpEmailBtn"),p=document.getElementById("xpEmailPop");' +
      'if(!b||!p)return;' +
      'function place(){var r=b.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;' +
      'var l=Math.max(8,Math.min(r.left,window.innerWidth-w-8)),t=r.bottom+8;' +
      'if(t+h>window.innerHeight-8)t=Math.max(8,r.top-h-8);' +
      'p.style.left=l+"px";p.style.top=t+"px";}' +
      'function close(){p.hidden=true;b.setAttribute("aria-expanded","false");}' +
      'function open(){p.hidden=false;b.setAttribute("aria-expanded","true");place();}' +
      'b.addEventListener("click",function(e){if(p.hidden){e.preventDefault();open();}else{close();}});' +
      'document.addEventListener("click",function(e){if(p.hidden)return;' +
      'if(b.contains(e.target)||p.contains(e.target))return;close();});' +
      'document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});' +
      'var c=p.querySelector(".pop-close");if(c)c.addEventListener("click",close);' +
      /* 滚动/改窗口大小时跟着按钮走，而不是关掉（避免误触发的 scroll 事件把弹窗吞掉） */
      'window.addEventListener("scroll",function(){if(!p.hidden)place();},{passive:true});' +
      'window.addEventListener("resize",function(){if(!p.hidden)place();});' +
      '})();</script>'
    ));
  }

  return oneLine(html.join(''));
});

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
registerTag('xp_todo', (args) => todoMini(parseInt(args[0], 10) || 4));
registerTag('xp_apps', () => appsGrid());
registerTag('xp_guides', () => guidesList());
registerTag('xp_work_gallery', () => workGallery());

/* 供注入器 / 过滤器复用（/blog/ 的待办窗口、文章页窗口按钮） */
hexo.extend.helper.register('xp_todo_mini', (limit) => todoMini(limit == null ? 4 : limit));
hexo.extend.helper.register('xp_bullet', () => BULLET);
hexo.extend.helper.register('xp_num_of', (key) => num(key));
