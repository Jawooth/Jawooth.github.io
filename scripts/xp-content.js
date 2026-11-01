/* global hexo */
/**
 * 内容渲染层：把「数字 / 列表 / 标签云 / 待办 / 卡片」统一交给构建期生成。
 *
 * 背景：首页原先手写死了文章数、作品列表、标签云和待办，导致
 * 「示例文章改日期 → 首页链接 404」「标签云里 7 个标签根本不存在」这类漂移。  * 现在页面里只写 {% xp_xxx %}，数据一律来自 site.posts / site.tags 与 source/_data/*.yml。  *
 * 可用标签：* *   {% xp_num <键  %}                   单个统计数字，键见下面 num() 里的 switch
 *   {% xp_stat_rows %}                  首页「小站数据」  *   {% xp_recent_posts 4 [exclude=分类]} 最近更新列表（exclude= 可排掉某个分类）
 *   {% xp_recent_works 3 %}              最近作品横栏  *   {% xp_tag_cloud pill|cloud %}        标签云（pill=首页胶囊 / cloud=作品页）
 *   {% xp_todo N %}                     待办清单（N=显示前 N 条；填 0=显示全部） *省略时默认 4 来 *（  *   {% xp_apps %}                        游戏/工具卡片（含分组标题条）
 *   {% xp_guides %}                      攻略/教程分组列表
 *   {% xp_work_gallery %}                作品页：原创/同人分栏 + 时间轴 + 标签筛选 + 原地展开
 *
 * 另外还有若干 hexo.extend.helper.register 注册的辅助函数（xp_quotes / xp_music /
 * xp_profile_icons / xp_bullet / xp_num_of / xp_widget_* 等），供模板直接调用，  * 完整清单以本文件里的 registerTag 一 helper.register 调用为准。  */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
/* 播放器的「外观」与「行为」放在单独文件里，见 scripts/xp-player.js */
const playerView = require('./xp-player');
/* 复用「常量脚本外链化」机制（generator 虚拟路由 + ?v= 版本号），hexo 传入 */
const { routeJs } = require('./_xp-route-js');
/* 点阵图标库：首页的社交图标行也用这一套（见下文 PROFILE_ICONS：
*/
const { GLYPHS: PIX_GLYPHS } = require('./xp-icons');

const WORK_CATEGORY = '作品';
const PILL_CLASSES = [
  'tag-pixel', 'tag-char', 'tag-landscape', 'tag-sketch', 'tag-illust',
  'tag-guide', 'tag-essay', 'tag-game', 'tag-clannad', 'tag-life'
];
/* ---------------------------------------------------------------- 基础工具 */
/* ⚠ 本文件与 xp-player.js 各有一份完全相同的 esc —— 这是**有意保留**的，
   不是漏改：Hexo 会把 scripts/ 下每一 .js 单独包进一一 IIFE 注册
   （见 node_modules/hexo/dist/hexo/index.js 的 loadPlugin：body 被拼成    `(async function(exports, require, module, __filename, __dirname, hexo){...})`），
   所以两个文件里的 const 根本不在同一个作用域，既不会冲突也共享不了。    想「抽公共模块」就只能往 globalThis 上挂，对 4 行字符串替换来说是倒退。    改这里时记得同步改 xp-player.js:18 那一份。
*/
const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 内联 <script> 里灌数据用的 JSON：把 < 转义成 \u003c。    原因：裸 JSON.stringify 不转也 <，数据（歌名 / 句子 / 正文）里只要出现
   "</script>" 字样，就会把脚本标签提前闭合，整页 HTML 从那里开始错乱。    \u003c 是合法的 JSON 写法，解析结果完全一样，只是页面源码里不再出现字面的 <。    ⚠ 凡是写进 <script>window.XP_XXX = — /script> 的数据都必须过这里，
     不要退回裸 JSON.stringify（独立的 .json 文件如 search.json 不在此列）。
*/
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

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

/* 读图片真实像素尺寸（只读文件头，不依赖任何图像库）。    2026-10-17 起用于给 <img> 行 width/height，减少图片加载造成的布局跳动。    拿到就返图 [宽  高]，读不到（文件不存在 / 格式没覆盖）就按误差最小的方图返回。
*/
function imageSize(src, fbW, fbH) {
  const fallback = [fbW || 1, fbH || fbW || 1];
  try {
    const rel = String(src || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const f = path.join(hexo.base_dir, 'source', decodeURIComponent(rel));
    const b = fs.readFileSync(f);
    if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {
      return [b.readUInt32BE(16), b.readUInt32BE(20)];
    }
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i += 1; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch (e) { /* 读不到就用兜底值 */ }
  return fallback;
}

/* 数据文件缓存：一次构建里 todo/profile/apps/guides/quotes/music/decor 会被
   十几一 tag/helper 反复读取（例如首页 num('todo_*') 一次就说 3 道 todo.yml），
   不缓存的话每个调用点都重读磁目 + 重解果 YAML。这里按文件名缓存解析结果，
   generateBefore 时清掉（watch 模式下数据文件改动后重新生成时能拿到新值）。    works 的缓存（worksCache，L487）是本模式的先例。
*/
const dataCache = {};
hexo.on('generateBefore', () => { for (const k in dataCache) delete dataCache[k]; });

function dataFile(name) {
  if (name in dataCache) return dataCache[name];
  const file = path.join(hexo.base_dir, 'source', '_data', name + '.yml');
  try {
    return (dataCache[name] = yaml.load(fs.readFileSync(file, 'utf8')) || []);
  } catch (err) {
    hexo.log.warn('[xp-content] 读取 %s 失败：%s', file, err.message);
    return (dataCache[name] = []);
  }
}

/* ---------------------------------------------------------------- 数据查询 */
/*
 * 这里刻意不使用 hexo.locals.get('posts') / get('tags')。  *
 * 原因：Hexo 的 locals 是惰性求值 + 缓存的，而 source/_posts 的 Category/Tag
 * 虚拟字段（hexo/dist/models/{category,tag}.js 的 `posts` virtual 会调用  * ctx.locals.get('posts')）会在 load 阶段、文章还没全部入库时就把 'posts' 缓存下来。  * 与此同时，source 下的页面文件在 load 阶段就会被渲染（早于 _runGenerators 的  * invalidate），于是页面读到的是那份"只加载了一部分"的快照 —— 表现为首页统计  * 数字和列表只显示一部分文章（例如 4 篇文章显示成 2 篇）。  *
 * 直接查模型：始终反映当前数据库中完整的已发布文章。  */
const isDraftEnabled = () => hexo.config.render_drafts || (hexo.env.args && hexo.env.args.draft);

function allPosts() {
  const query = {};
  if (!hexo.config.future) query.date = { $lte: Date.now() };
  if (!isDraftEnabled()) query.published = true;
  return q2a(hexo.database.model('Post').find(query, { lean: false })).sort((a, b) => b.date - a.date);
}

function allTags() {
  /* 排序规则：先按文章数从多到少，同数量的再按名字排。      第二级排序不能省：hexo.database 里标签的初始顺序取决于各个      处理器异步完成的先后，每次构建都不一样；只按文章数排的话，      同数量的标签每次都换位置 —— 现象就是「没改任何东西，构建出来的      页面却次次不同」，标签云顺序乱跳，diff 也没法看。
*/
  return q2a(hexo.database.model('Tag').find({}, { lean: false }))
    .filter((t) => t.length)
    .sort((a, b) => (b.length - a.length) || String(a.name).localeCompare(String(b.name), 'zh'));
}

function allCategories() {
  /* 同上：加一个确定的排序，保证每次构建结果一自 */
  return q2a(hexo.database.model('Category').find({}, { lean: false }))
    .filter((c) => c.length)
    .sort((a, b) => (b.length - a.length) || String(a.name).localeCompare(String(b.name), 'zh'));
}

const catsOf = (post) => q2a(post.categories).map((c) => c.name);
const tagsOf = (post) => q2a(post.tags).map((t) => t.name);
const fmtDate = (post) => (post.date && post.date.format ? post.date.format('YYYY-MM-DD') : '');

/* 「杂谈列表里不出现的分类」，配在 _config.minimalism.yml 的 index_exclude_categories。    ⚠ 必须和 themes/minimalism/scripts/filters/post-hide.js 里 index 生成器的过滤规则
   同源，否则「共 N 篇」会和实际卡片数对不上（2026-10 就出过一次：列表 2 张、头部写 5 篇）。
*/
function listExcludeCategories() {
  const raw = (hexo.theme.config && hexo.theme.config.index_exclude_categories) || [];
  return (Array.isArray(raw) ? raw : [raw]).map(String);
}

/* 「文字」列表的篇数，  除作品以外的全部篇目，与 /blog/ 头部「共 N 篇」同源）。    2026-10-18 前它的注释写的是「杂谈」，合并成「文字」后语义没变，只是名字换了。
*/
function essayPosts() {
  const exclude = listExcludeCategories();
  if (!exclude.length) return allPosts();
  return allPosts().filter((p) => !catsOf(p).some((c) => exclude.indexOf(c) >= 0));
}

/* 「文章」分区（/guides/）的篇数。    ⚠ 必须和 themes/minimalism/scripts/filters/post-hide.js 里 articles 生成器同源：
   两边都读 _config.minimalism.yml 的 articles_category，否则首页统计与
   /guides/ 头部「共 N 篇」会对不上（essays 那条注释里记过同样的坑）。
*/
function articlePosts() {
  const wanted = String((hexo.theme.config && hexo.theme.config.articles_category) || '文章').trim();
  if (!wanted) return [];
  return allPosts().filter((p) => catsOf(p).indexOf(wanted) >= 0);
}

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
    /* 「文章」在首页统计与杂谈列表头部都用它 —— 它指的是**杂谈**，        不含作品（作品有自己的作品页），所以这里要跟列表一样排掉作品。
*/
    case 'essays': return essayPosts().length;
    /* 「文章」分区（/guides/）的篇数，与 articles 生成器同源（见 articlePosts 的注释） */
    case 'articles': return articlePosts().length;
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
/* XP.css 风格窗口按钮：用 SVG 图标代替文字符号，更接近原版 */
const WIN_BTN_MIN = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="7" width="8" height="2" fill="currentColor"/></svg>';
const WIN_BTN_MAX = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const WIN_BTN_CLOSE = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>';
const BULLET = '<span class="xp-window-btns" role="group" aria-label="窗口操作">' +
  '<i class="xp-window-btn" data-action="min" role="button" tabindex="0" aria-label="最小化">' + WIN_BTN_MIN + '</i>' +
  '<i class="xp-window-btn" data-action="max" role="button" tabindex="0" aria-label="最大化">' + WIN_BTN_MAX + '</i>' +
  '<i class="xp-window-btn close" data-action="close" role="button" tabindex="0" aria-label="关闭">' + WIN_BTN_CLOSE + '</i>' +
  '</span>';

/* 待办三态勾选框：改用点阵图案（icon-todo-done / -doing / -pending），
   颜色烘进方块里，不再面 currentColor 描边。
*/
function todoIcon(state) {
  const done = state === 'done';
  const doing = state === 'doing';
  const art = done ? 'icon-todo-done' : doing ? 'icon-todo-doing' : 'icon-todo-pending';
  const label = done ? '已完成' : doing ? '进行中' : '待做';
  return `<svg class="todo-check${done || doing ? '' : ' pending'}" width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-label="${label}"><use href="#${art}"/></svg>`;
}

function statRows() {
  /* 待办行不再链到独立页面（该页已删除），只作为数字展示；想看清单去杂谈页。 
     ⚠ 标签与链接必须和导航菜单（_config.minimalism.yml 的 menu）对得上，      2026-10-14 站主把导航改名成「绘用 / 文章」之后，这里还写着
     「文章→/blog/、作品→/works/」，等于点「文章」跳到杂谈、名字与页面不符。      现在四行分别对应导航里的 绘画 / 文章 / 杂谈 / 归档口径，标签即页面名。      想再加一行，照下面的格式行 { cls, label, key, href } 即可。
*/
  const rows = [
    { cls: 'doing', label: '绘画', key: 'works', href: '/works/' },
    /* ★ 2026-10-18：「文章」 /guides/) 与「杂谈」 /blog/) 合并成「文字」，
       所以这里也只剩一行，链接到 /blog/。别再拆回两行 —— 菜单里已经没有        /guides/ 这个入口了（它现在只做 301 跳转）。
*/
    { cls: 'done', label: '文字', key: 'essays', href: '/blog/' },
    { cls: 'todo', label: '待办', key: 'todo_todo', href: '/blog/#xp-todo' }
  ];
  return oneLine(rows.map((r) => (
    `<div class="stat-row"><span class="stat-dot ${r.cls}"></span>` +
    `<span class="stat-label">${r.href ? `<a href="${r.href}">${r.label}</a>` : r.label}</span>` +
    `<strong>${num(r.key)}</strong></div>`
  )).join(''));
}

/* exclude 可以是单个分类名，也可以是数组（首页那个标签写的是 `exclude=作品`（**/
function recentPosts(limit, exclude) {
  const skip = exclude ? (Array.isArray(exclude) ? exclude : [exclude]) : [];
  let list = allPosts();
  if (skip.length) {
    list = list.filter((p) => !catsOf(p).some((c) => skip.indexOf(c) >= 0));
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
  // 不再给第一张加 .featured：所有卡片大小一致（原来第一张更宽、还带蓝色描边）
  const cards = posts.map((p) => (
    `<a class="recent-work-item" href="${href(p.path)}">` +
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
      `<a class="cloud-tag${t.length > 1 ? ' big' : ''}" href="${href(t.path)}" title="${t.length} 篇 >${esc(t.name)}</a>`
    ));
    return oneLine(`<div class="tag-cloud">${items.join('')}</div>`);
  }
  /* 药丸版（侧栏「标签云」窗口用的就是这个）：
     字号按文章数缩放 —— 窗口标题写着「标签云」，以前所有药丸都是 16px，
     只靠颜色区分，看着就是普通标签列表，名不副实。
     用对数缩放而不是线性：文章数是 1..N 的长尾分布，线性会让最大标签撑爆、
     其余全挤在最小档。log(count)/log(max) 在 count=1 时正好是 0，
     所以最少的一档仍然是 16px（正文基准），不会小于正文。
     字号写进 --pill-size 自定义属性，实际字号仍由 CSS 决定（.tag-pill 用 var 读它），
     这样以后改整体字号只改 CSS 一处，不必回来改这里。 */
  const maxCount = Math.max.apply(null, tags.map((t) => t.length));
  const sizeOf = (n) => {
    if (maxCount <= 1) return 16;
    const ratio = Math.log(n) / Math.log(maxCount);
    return Math.round(16 + ratio * 6);   // 16px → 22px
  };
  /* 颜色按**标签名**取，而不是按列表下标轮转。
     以前是 PILL_CLASSES[i % 10]：标签一多或文章数一变，排序跟着变（allTags 按数量排），
     同一个标签的颜色会在两次构建之间换来换去，看着像"标签自己换了颜色"。
     改成名字哈希，同一个标签永远同一个颜色（哈希只决定色板槽位，不表示语义）。 */
  const colorOf = (name) => {
    let h = 0;
    const s = String(name);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PILL_CLASSES[h % PILL_CLASSES.length];
  };
  const items = tags.map((t) => (
    `<a class="tag-pill ${colorOf(t.name)}" style="--pill-size:${sizeOf(t.length)}px" href="${href(t.path)}" title="${t.name} · ${t.length} 篇">${esc(t.name)}` +
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
    /* 2026-10-22 站主要求：待办条目也能点进去。        在 todo.yml 里给条目动 url: https://…（或站写 /blog/xxx/）即可变成直达链接；
       没写 url 就还是纯文字，排版不变。外链补 rel="noopener noreferrer" 与小箭头。
*/
    const raw = String(t.url || '').trim();
    const text = esc(t.text);
    const doneCls = state === 'done' ? ' done' : '';
    let inner;
    if (raw) {
      const isOut = /^https?:\/\//i.test(raw) || /^mailto:/i.test(raw);
      inner =
        `<a class="todo-link${doneCls}" href="${esc(isOut ? raw : href(raw))}"` +
        (isOut ? ' target="_blank" rel="noopener noreferrer"' : '') +
        `>${text}${isOut ? '<i class="todo-ext" aria-hidden="true"></i>' : ''}</a>`;
    } else {
      inner = `<span class="${doneCls.trim()}">${text}</span>`;
    }
    return `<li>${todoIcon(state)}${inner}</li>`;
  });
  return oneLine(`<ul class="todo-mini-list">${items.join('')}</ul>`);
}

/* 全量三栏视图（todoFull）已随 /todo/ 页一并删除：
   待办清单现在只出现在杂谈页一处，显示全部条目并按 进行中 → 待做 → 已完成 排序。
*/

/* 小游戏 / 小工具卡片。只看某一组时会 'game' 成 'tool'， 026-10-14，    游戏与工具拆成两个独立页面，各自只显示自己那一组；不传就两组都出）。
*/
/* 卡片的三个输出模式（2026-10-18，站主要求 PC 端两个窗口并排），      xp_apps game             → 小游戏卡片（旧写法，等价了 cards，      xp_apps cards tool       → 只有卡片：由模板自己包进左右两个窗口里      xp_apps pane  game     → 一整块「窗口 + 卡片区」的容器，                            游戏页左栏放 game、工具页左栏改 tool，                            两页右边各放自己的兄弟窗口。
*/
const APP_PANES = {
  game: { key: 'game', label: '小游戏', icon: 'icon-gamepad', sub: '摸鱼专用区' },
  tool: { key: 'tool', label: '小工具', icon: 'icon-wrench', sub: '小工具区' }
};

/* 查一组卡片的元信息。⚠ 一定要兜底：传进来的 key 可能是 'games'（页面名，    也可能是 'game'（数据分组名），历史上站点里两种写法都出现过。
*/
function appPaneMeta(key) {
  if (APP_PANES[key]) return APP_PANES[key];
  const k = String(key || '').replace(/s$/, '');
  return APP_PANES[k] || { key: 'game', label: '清单', icon: 'icon-gamepad', sub: '清单化' };
}

function appPaneHead(key) {
  const meta = appPaneMeta(key);
  /* 窗口标题里的图标用 <use href="#icon-…
>：那了 symbol 由页面自己的
     <svg><defs>— 定义（games/index.md、tools/index.md 顶部各有一套），      不在这些页面里调有 tag 的话图标会空 —— 目前只有这两页用它。
*/
  return (
    `<div class="xp-window-title">` +
    `<span class="xp-window-title-text"><svg class="inline-icon" width="1.15em" height="1.15em" aria-hidden="true"><use href="#${meta.icon}"/></svg> ${meta.label}</span>` +
    `<span class="xp-window-btns" role="group" aria-label="窗口操作">` +
    `<i class="xp-window-btn" data-action="min" role="button" tabindex="0" aria-label="最小化">${WIN_BTN_MIN}</i>` +
    `<i class="xp-window-btn" data-action="max" role="button" tabindex="0" aria-label="最大化">${WIN_BTN_MAX}</i>` +
    `<i class="xp-window-btn close" data-action="close" role="button" tabindex="0" aria-label="关闭">${WIN_BTN_CLOSE}</i>` +
    `</span></div>`
  );
}

function appsCards(only) {
  const apps = dataFile('apps');
  const all = [
    { key: 'game', label: '小游戏', icon: 'icon-gamepad' },
    { key: 'tool', label: '小工具', icon: 'icon-wrench' }
  ];
  /* 只传一组时按 页面名或分组名 都认，'games' 和 'game' 都能命中 */
  const want = only ? appPaneMeta(only).key : '';
  const groups = only ? all.filter((g) => g.key === want) : all;
  const out = groups.map((g) => {
    const items = apps.filter((a) => a.group === g.key);
    const cards = items.map((a) => {
      const online = a.status === 'online' && a.url;
      return (
        `<div class="games-item games-card">` +
        `<div class="app-card ${online ? 'is-link' : 'is-planned'}">` +
        /* 卡片图标优先用 apps.yml 每张卡片自己的 icon 字段，没有再落回分组图标。
           （2026-10-31 修复：原来写死 g.icon，apps.yml 里配的 icon-brick/snake/
           puzzle/calc/notepad 全部被无视，games 页 3 张卡全是手柄、tools 页全是扳手。） */
        `<div class="app-icon"><svg width="42" height="42" aria-hidden="true"><use href="#${a.icon || g.icon}"/></svg></div>` +
        `<div class="app-info"><h4 class="app-title">${esc(a.name)}</h4><p class="app-desc">${esc(a.desc)}</p></div>` +
        (online
          ? `<a class="app-link" href="${esc(a.url)}" aria-label="${esc(a.name)}"></a>`
          : '<span class="xp-badge">开发中</span>') +
        `</div></div>`
      );
    }).join('');
    /* 分组抬头。        ⚠ 历史：这里原来输出 .xp-section-bar（一条 34px 的蓝色渐变条，和窗口标题栏同款）。          2026-10-18 站主要求 PC 端两个窗口并排后，两个窗口各自都有一条窗口标题栏，          里面再顶一条一模一样的蓝条 = 双蓝条，视觉上重复且压掉卡片区空间。          现在改成轻量的「共 N 个」小标题：不加底色、不加阴影，只做分组说明。          ， xp-section-bar 这个组件本身保留，其他页面还在用。） */
    const bar = (
      `<div class="games-item games-section-title"><div class="pane-subhead">` +
      `<svg width="1.15em" height="1.15em" aria-hidden="true"><use href="#${g.icon}"/></svg>` +
      `<span>${g.label} · 共 ${items.length} 个</span></div></div>`);
    return bar + cards;
  });
  if (!apps.length) return '<div class="games-item"><p class="xp-empty">清单还没有内容</p></div>';
  return oneLine(out.join(''));
}

/* 一整块容器：外层 .xxx-pane 负责在网格里占半行（PC 并排），
   内层 .xp-window 负责 XP 外观，卡片区放进 .xp-window-body。    ⚠ 类名要跟页面上的写法一致：games 页用 .games-pane，tools 页用 .tools-pane
     （见 games/index.md 一 tools/index.md 末尾的内联 <style>）。
*/
function appsPane(key, kind) {
  const meta = appPaneMeta(key);
  const body = appsCards(meta.key || key);
  return oneLine(
    `<div class="${kind}-item ${kind}-pane">` +
    `<div class="xp-window">` +
    appPaneHead(key) +
    `<div class="xp-window-body"><div class="pane-grid">${body}</div></div>` +
    `</div></div>`
  );
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
      `<svg width="1.15em" height="1.15em" aria-hidden="true"><use href="#${g.icon}"/></svg>` +
      `<span>${esc(g.label)} (${(g.items || []).length})</span></div></div>` +
      `<div class="guides-item guides-list"><ul class="guide-list">${items}</ul></div>`
    );
  });
  return oneLine(out.join(''));
}

/* ---------------------------------------------------------------- 作品集（分栏目 + 时间轴 + 筛选） */
/* 栏目与时间轴分期都放在 source/_data/works.yml 里（以前写死在这里，
   注释还写着「想改分期就改这里」—— 那个文件是代码，非程序员改不动）。    下面这份 DEFAULT 只是 works.yml 缺失/写坏时的兜底。 
   为什么要有缓存：下面 eraOrder() 会在排序的比较函数里反复用到分期表，
   每调一次都去读一遍 YAML 会把构建拖慢。所以每次生成开始时读一次并缓存，    generateBefore 时清掉。
*/
const WORK_DEFAULTS = {
  origins: ['原创', '同人'],
  eras: [
    { label: '远古期', from: '0000-01-01', to: '2024-01-01' },
    { label: '2024 年', from: '2024-01-01', to: '2025-01-01' },
    { label: '2025 年', from: '2025-01-01', to: '2026-01-01' },
    { label: '2026 年上半年', from: '2026-01-01', to: '2026-06-01' },
    { label: '2026 年 6-10 月', from: '2026-06-01', to: null }
  ]
};

let worksCache = null;
hexo.on('generateBefore', () => { worksCache = null; });

function worksConfig() {
  if (worksCache) return worksCache;
  const raw = dataFile('works') || {};
  const cfg = Array.isArray(raw) ? {} : raw;

  const origins = (Array.isArray(cfg.origins) && cfg.origins.length)
    ? cfg.origins.map((o) => String(o)).filter((o) => o)
    : WORK_DEFAULTS.origins;

  const eras = (Array.isArray(cfg.eras) && cfg.eras.length ? cfg.eras : WORK_DEFAULTS.eras)
    .filter((e) => e && e.label)
    .map((e) => ({
      label: String(e.label),
      from: String(e.from || '0000-01-01'),
      to: e.to ? String(e.to) : null
    }));

  worksCache = { origins: origins.length ? origins : WORK_DEFAULTS.origins, eras };
  return worksCache;
}

const workOrigins = () => worksConfig().origins;

/* 栏目：文章里写 origin: 同人，没写就当原到 */
function workOrigin(post) {
  const raw = String(post.origin || '').trim();
  return workOrigins().indexOf(raw) >= 0 ? raw : workOrigins()[0];
}

/* 瀑布流封面尺寸：构建期读图片文件头拿真实宽高，写这 <img width/height>，    图片加载前浏览器就知道占位比例，瀑布流不会塌（CLS）。    实现 = 下面的 imageSize() 加一条「只认站内路径」的前置校验（本函数旧版
   自带一份重复的文件头解析，2026-10-19 收敛到这里；xp-enhance.js 的    readImageSize 是第三份，模块作用域隔离借不到，那边还多支持 GIF）。
*/
function coverSize(src) {
  if (!src || src.charAt(0) !== '/') return null;
  const [w, h] = imageSize(src, 0, 0);
  /* imageSize 失败时返回兜底值（1×1 之类），但封面尺寸要「确有其图」才有用，      读不到就返回 null，卡片少个占位比例而已。
*/
  return (w > 1 || h > 1) ? { width: w, height: h } : null;
}

/* 瀑布流卡片（2026-10-18 站主定稿）：只显示封面（实际比例，不预裁剪）、标题。    简介（front-matter 的 desc:）、标签；点击整卡直接进作品详情页。    旧版的日期 分类/状态角标 分期标 「展开全文」随就地展开一起下约 ——    works-bodies.json 生成器也删了（本文件下方），构建产物随之变瘦。
*/
function workCardHtml(post) {
  const tags = tagsOf(post);
  const thumb = post.thumbnail || post.img || '';
  const title = post.short_title || post.title;
  const desc = String(post.desc || '').trim();
  const size = thumb ? coverSize(thumb) : null;
  const dim = size ? ` width="${size.width}" height="${size.height}"` : '';
  const tagButtons = tags.map((t) => (
    `<button type="button" class="work-tag" data-tag="${esc(t)}" title="只看「 {esc(t)}」">${esc(t)}</button>`
  )).join('');
  return (
    `<article class="work-card" data-tags="${esc(tags.join(' '))}" data-origin="${esc(workOrigin(post))}">` +
    `<a class="work-thumb" href="${href(post.path)}">` +
    (thumb ? `<img src="${esc(thumb)}" alt="${esc(title)}" loading="lazy" decoding="async"${dim}>` : '') +
    `</a>` +
    `<div class="work-card-body">` +
    `<h3 class="work-card-title"><a href="${href(post.path)}">${esc(title)}</a>${lockMarkIf(post)}</h3>` +
    (desc ? `<p class="work-card-desc">${esc(desc)}</p>` : '') +
    (tagButtons ? `<div class="work-card-tags">${tagButtons}</div>` : '') +
    `</div>` +
    `</article>`
  );
}

function workGallery() {
  const posts = workPosts();
  if (!posts.length) return '<p class="xp-empty">这里还没有作品</p>';

  /* 标签统计（用于筛选条）
*/
  const tagCount = {};
  posts.forEach((p) => tagsOf(p).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  /* 上 allTags() 同一套排序规则：先按作品数，同数再按名字。      第二级不能省 —— 本站 6 个作品标签目前 *数量全是 1**，只按数量排
     等于没排，顺序会退图 Object.keys 的插入序（每次构建都可能变）。
*/
  const tags = Object.keys(tagCount)
    .sort((a, b) => (tagCount[b] - tagCount[a]) || String(a).localeCompare(String(b), 'zh'));

  const tabs = workOrigins().map((o, i) => {
    const n = posts.filter((p) => workOrigin(p) === o).length;
    return `<button type="button" class="work-tab${i === 0 ? ' is-active' : ''}" data-origin="${esc(o)}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}">${esc(o)} <span class="tab-count">${n}</span></button>`;
  }).join('');

  const pills = tags.map((t) => (
    `<button type="button" class="filter-pill" data-tag="${esc(t)}" aria-pressed="false">${esc(t)} <span class="pill-count">${tagCount[t]}</span></button>`
  )).join('');

  /* 每个栏目一Pane，内容按时间从新到旧平铺成瀑布流（不再按分期折叠） */
  const panes = workOrigins().map((origin) => {
    const mine = posts.filter((p) => workOrigin(p) === origin)
      .slice().sort((a, b) => (new Date(b.date) - new Date(a.date)) || String(b.path).localeCompare(String(a.path)));
    return (
      `<div class="work-pane${origin === workOrigins()[0] ? ' is-active' : ''}" data-origin="${esc(origin)}" role="tabpanel"${origin === workOrigins()[0] ? '' : ' hidden'}>` +
      (mine.length
        ? `<div class="work-grid">${mine.map(workCardHtml).join('')}</div>`
        : '<p class="xp-empty">这个栏目还没有作品</p>') +
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
    `});` +
    `apply();` +   /* 首次也走一遍：让状态栏数字与当前栏目一自 */
    `})();</script>`
  );

  return oneLine(`<div class="work-gallery">${toolbar}${panes}</div>` + script);
}

/* ---------------------------------------------------------------- 搜索索引 */
/* 生成 /search.json，供首页搜索框在浏览器端匹配（替代原来指同 /blog/?q= 的死链） */
/* 正文转纯文本统一起 stripHtml（见文件下方定义），此处不再各写一份：
   原来这里有个局部 strip()，比 stripHtml 少了解码实体那几行，
   结果搜索索引里的文字带着 &amp; 而卡片摘要里是 &，    同一段内容在站内出现两种写法。
*/
hexo.extend.generator.register('xp-search-index', () => {
  const posts = allPosts().map((p) => ({
    title: p.title,
    url: href(p.path),
    date: fmtDate(p),
    meta: metaOf(p),
    /* 加密文章（front matter 写了 password）不进索引正文：
       2026-10-22 安全审查 —— hexo-blog-encrypt 渲染后 p.content 会被换成密码框，
       实测索引里留下的是 message 那句提示语（「密码是本人生日。」）。        正文本身没漏（密文在页面里），但这条通路全靠插件内部实现撑着，        换个版本就可能把摘要甚至明文带进来。宁可搜不到，也不赌它。        标题/日期/分类照常入索引，所以站内搜索仍能搜到这篇文章的标题。
*/
    /* 正文全文入索引：不截断。
       以前 slice(0,600) 会把 600 字之后的正文丢出索引，中文关键词只要不在每篇开头
       就搜不到（实测「素描」只因为出现在某篇标题+开头才命中）。文章都很短（最大 3.5KB），
       全量索引 < 20KB，传输可忽略。stripHtml 已压空白并 trim，不需要再截。
       加密文章（password）仍不进正文，只保留标题/日期/分类（见上）。
    */
    text: p.password ? '' : stripHtml(p.content)
  }));
  return {
    path: 'search.json',
    data: JSON.stringify({ posts })
  };
});

/* ---------------------------------------------------------------- 播放器与便签 */
/* 曲目表来源，按优先级：    - source/_data/music.yml 的 tracks（手工填的曲目）
   - source/_data/music-tracks.yml（tools/fetch/fetch-netease.py 从网易云歌单生成）    - 都没有、但有 netease_playlist 时才退回网易云官方外链播放器    （纯列表格式的老写法也兼容） */
function musicData() {
  const raw = dataFile('music') || {};
  const gen = dataFile('music-tracks');
  const genTracks = Array.isArray(gen) ? gen : (gen && Array.isArray(gen.tracks) ? gen.tracks : []);
  const ownTracks = Array.isArray(raw) ? raw : (Array.isArray(raw.tracks) ? raw.tracks : []);
  const tracks = ownTracks.length ? ownTracks : genTracks;
  const id = !Array.isArray(raw) && raw.netease_playlist ? String(raw.netease_playlist).trim() : '';
  return { tracks, netease: tracks.length ? null : (id && id !== '0' ? id : null) };
}

/* 播放器界面上的文案（music.yml 可改）
*/
function musicUi() {
  const raw = dataFile('music') || {};
  const cfg = Array.isArray(raw) ? {} : raw;
  return {
    title: String(cfg.player_title || 'XP-MP4'),
    empty: String(cfg.player_empty_text || '未配置曲目')
  };
}

/* 播放器：同时注册成 tag 和 helper。    · tag 模式（{% xp_music %}）：在页面内联插入（主要是历史兼容，首页 bento 里之前用的）。    · helper 模式（footer.ejs 里调用）：全局固定浮动条，每个页面都渲染，切页面不丢状态。    两种模式输出完全相同的 HTML（脚本里会自动判断自己是不是第一个实例，避免重复初始化）。    ⚠️ 外观和驱动脚本都**不能**过 oneLine()：驱动脚本里有 // 注释与依赖换行的
   语句，压成一行会把注释后面的代码整段吃掉。
*/
function musicBlock() {
  const { tracks, netease } = musicData();
  const ui = musicUi();
  const shell = playerView.markup(ui.title);
  /* 驱动脚本是常量（不随页面/曲目变化），外链成 /js/xp-music-player.js 共享缓存，      每页 HTML 看 ~20KB；曲目数据 window.XP_MUSIC 仍留内联（页级数据）。
*/
  const driver = '<script src="/js/xp-music-player.js" defer></script>';

  /* 模式 B：网易云歌单 —— 用官方外链播放器 iframe，不加载 APlayer */
  if (netease) {
    const src = '//music.163.com/outchain/player?type=0&id=' + encodeURIComponent(netease) + '&auto=0&height=430';
    return oneLine(
      '<script>window.XP_MUSIC = []; window.XP_MUSIC_EMBED = true;' +
        `window.XP_MUSIC_UI = ${json(ui)};</script>` +
      '<div class="xp-music-embed"><iframe src="' + src + '" width="100%" height="100%" frameborder="0" ' +
      'loading="lazy" title="网易云音乐歌单播放器"></iframe></div>'
    ) + '\n' + shell + '\n' + driver;
  }

  /* 模式 A：自己的曲目 —— 只有真的填了曲目才加载 APlayer（省流量）
*/
  const config = `<script>window.XP_MUSIC = ${json(tracks)};</script>`;
  const assets = tracks.length
    ? '<link rel="stylesheet" href="/vendor/aplayer/APlayer.min.css">' +
      '<script src="/vendor/aplayer/APlayer.min.js"></script>'
    : '';
  return assets + config + '\n' + shell + '\n' + driver;
}
hexo.extend.tag.register('xp_music', () => musicBlock());
hexo.extend.helper.register('xp_music', () => musicBlock());
/* 播放器驱动外链文件（内容见 xp-player.js 的 DRIVER；上面 musicBlock 引用它） */
routeJs(hexo, '/js/xp-music-player.js', () => playerView.driver);

/* ---------------------------------------------------------------- 视频 */
/* 两条路，页面里都只写一行标签：
     ② 哔哩哔哩（推荐）：{% xp_bilibili BV1xx411c7mD %}
        视频存在 B 站，不占本站体积、不耗本站流量；代价是封面与清晰度受 B 站控制、要联网。      ② 本地文件：{% xp_video /videos/xxx.mp4 [封面图] %}
        把文件放这 source/videos/，会跟着一起发布。⚠ 大文件不要这么干（见 README.md 第 4 节）。 
   为什么做成标签而不是在文章里手写 <iframe>/<video>，      iframe 必须有 *固定宽高比**，否则要么塌成 150px、要么把 XP 窗口撑破，      这堆样板藏在标签里，页面里就只剩一行（也免得改样式时要翻遍文章）。
*/

const BILI_BV_RE = /BV[0-9A-Za-z]{8,}/;

hexo.extend.tag.register('xp_bilibili', (args) => {
  const raw = String(args[0] || '').trim();
  if (!raw) throw new Error('{% xp_bilibili %} 缺参数：要给 BV 号（或整条视频链接）');
  const bv = (raw.match(BILI_BV_RE) || [])[0];
  if (!bv) throw new Error('{% xp_bilibili %} 认不出 BV 号：' + raw);
  /* 到 P 号：可以用第二个参数写，也可以直接从粘过来的链接里的 ?p=2 读出来 */
  const fromUrl = (raw.match(/[?&]p=(\d+)/) || [])[1];
  const page = String(args[1] || fromUrl || '1').replace(/[^\d]/g, '') || '1';
  const src = '//player.bilibili.com/player.html?bvid=' + bv +
    '&page=' + page + '&autoplay=0&danmaku=0&high_quality=1';
  return oneLine(
    '<div class="xp-embed"><iframe src="' + src + '" title="哔哩哔哩视频 ' + bv + '"' +
    ' loading="lazy" scrolling="no" frameborder="0" allowfullscreen="true"' +
    ' referrerpolicy="no-referrer"></iframe></div>'
  );
});

hexo.extend.tag.register('xp_video', (args) => {
  const src = String(args[0] || '').trim();
  if (!src) throw new Error('{% xp_video %} 缺参数：要给视频路径，例如 /videos/clip.mp4');
  const poster = String(args[1] || '').trim();
  const name = src.split('/').pop();
  /* 本地视频**不写死宽高比**：浏览器读到文件头就知道真实尺寸，写死反而会把竖屏视频压手 */
  return oneLine(
    '<figure class="xp-video"><video controls preload="metadata" playsinline src="' + esc(src) + '"' +
    (poster ? ' poster="' + esc(poster) + '"' : '') + '>' +
    '你的浏览器不支持 video 标签，可以 <a href="' + esc(src) + '">直接下载 ' + esc(name) + '</a>。' +
    '</video></figure>'
  );
});

/* 便签句子：从 source/_data/quotes.yml 读取，供首页脚本轮换 */
hexo.extend.tag.register('xp_quotes', () => {
  const raw = dataFile('quotes');
  const isList = Array.isArray(raw);
  const list = isList ? raw : (raw.quotes || []);
  const rotate = isList ? 0 : (Number(raw.rotate_seconds) || 0);

  /* 句子两侧的符号（想改成别的、或整个去掉，都改 quotes.yml）。      注意：只有「键完全没写」才用默认的「」；写成空字符串 '' 就是真的不要符号。
*/
  const ui = isList ? {} : raw;
  const hasUi = (k) => ui && Object.prototype.hasOwnProperty.call(ui, k);
  const left = hasUi('quote_left') ? String(ui.quote_left) : '「';
  const right = hasUi('quote_right') ? String(ui.quote_right) : '」';

  /* 只输出「数据 + 符号配置」。句子本体那件 HTML 在 source/index.md 里      （那是首页的排版位置，由页面决定）；这里把符号交给前端脚本去写。 
     ⚠️ 这里**故意不再输出**便签元素本身（即页面里那个带 sticky-quote 的 <p>）：
     2026-10 踩过 —— 页面里已经有一个，再输出一个就出现**重复 id**，      getElementById 只会拿到靠前的那个，另一个永远不更新；而且两条
     `.bubble-quote::before` 规则特异性相同、后声明者胜，符号会被空串覆盖，
     结果就是「在 quotes.yml 里改 quote_left/quote_right 完全没反应」。
*/
  return `<script>window.XP_QUOTES = ${json({ rotate, list, left, right })};</script>`;
});

/* ---------------------------------------------------------------- 侧栏 / 卡片 / 索引 片段 */
/* 这些 helper 供主题模板（themes/minimalism/layout/*.ejs）调用。    把「组件长什么样」留在模板里、把「数据是什么」留在这里，
   这样站主改样式不用碰 JS，改数据不用碰模板。
*/

const stripHtml = (html) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

/* 统一的侧栏卡片外壳（XP 窗口）    第 4 个参数 id 可选：给了就写到最外层 div 上，用于站内锚点直达
   ， 026-10-22：首页账户卡的「待办」要能点进来，锚点指到 /blog/#xp-todo）。
*/
function widget(title, body, extraClass, id) {
  if (!body) return '';
  return oneLine(
    `<div class="xp-window xp-widget ${extraClass || ''}"${id ? ` id="${id}"` : ''}>` +
    `<div class="xp-window-title"><span class="xp-window-title-text">${esc(title)}</span></div>` +
    `<div class="xp-window-body">${body}</div></div>`
  );
}

/* 卡片摘要：优先用 front matter 的 desc，其次取正文第一段。    不要直接截取整篇正文 —— 会把代码块、小节标题（"作品简介 之类）混进来。 
   加密文章（写了 password）多一层：desc 与正文都取不到时，用 abstract。    为什么需要这一层：加密文章在 *构建产物里的正文是空的 *（正文被换成密码框，
   只剩密文），所以 取正文第一段 这条路走不通，卡片会变成空白摘要。    hexo-blog-encrypt 的 abstract 本来就是给这种情况用的。    优先级仍是 desc 优先 —— 站主要求"标题简介照常显示 ，写了 desc 就用它。
*/
function excerptOf(post, len) {
  if (post.desc) {
    const d = String(post.desc).trim();
    return d.length > len ? d.slice(0, len) + '…' : d;
  }
  if (post.password) {
    const abs = post.abstract;
    if (abs) {
      const a = String(abs).trim();
      return a.length > len ? a.slice(0, len) + '…' : a;
    }
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

    /* ⚠ 加密文章不能用 post.content 统计，        hexo-blog-encrypt 在渲染后把 post.content 换成了密码框那几十个字符，        于是「大烧烤」明明一千多字，卡片上却写。  字」（2026-10-14 站主发现的）。        这类文章改从**源文件**统计，得到的才是真实字数。
*/
    let source = post.content;
    if (post.password && post.source) {
      try {
        const raw = fs.readFileSync(path.join(hexo.source_dir, post.source), 'utf8');
        /* 去掉 front matter（开头两行 --- 之间那段），只统计正文 */
        const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
        source = m ? raw.slice(m[0].length) : raw;
      } catch (e) { /* 读不到就退回原逻辑，不要让字数统计把构建搞按 */ }
    }

    const n = wc.call(ctx || {}, source);
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
  /* 头像件 2 倍显示尺寸声是 width/height， 2px × 2 = 144），
     让高分屏拿到足够像素；原来写死的 256 与实除 72px 差太远，
     浏览器要多做一次无谓的降采样（2026-10-14 顺手改掉）。
*/
  const body = oneLine(
    `<div class="xp-aside-author">` +
    `<img src="${esc(avatar)}" alt="${esc(name)}" width="144" height="144" loading="lazy" decoding="async">` +
    `<div class="name">${esc(name)}</div>` +
    `<div class="bio">${esc(bio)}</div>` +
    `<div class="links">` +
    `<a class="xp-btn xp-btn-small" href="/#about">关于本站</a>` +
    `<a class="xp-btn xp-btn-small" href="/works/">作品集</a>` +
    `<a class="xp-btn xp-btn-small" href="/blog/">全部文章</a>` +
    `<a class="xp-btn xp-btn-small" href="/thanks/">致谢</a>` +
    `</div></div>`
  );
  return widget('关于我', body);
});

/* 侧栏「最近文章」和首页「最新文章」、杂谈列表是一个口径：都不显示作品。    排除名单直接说 _config.minimalism.yml 的 index_exclude_categories（唯一真源），
   不要在这里写死 '作品' —— 那边改了分类，这边要跟着变才不会出现
   「列表里没有、侧栏里却有」这种对不上的情况。
*/
hexo.extend.helper.register('xp_widget_recent', (n) => widget('最近文章', recentPosts(n || 6, listExcludeCategories())));
hexo.extend.helper.register('xp_widget_tags', () => widget('标签云', tagCloud('pill')));
hexo.extend.helper.register('xp_widget_stats', () => widget('小站数据', statRows()));
/* 待办窗口带 id="xp-todo"：首页账户卡的「待办」数字链接到 /blog/#xp-todo 直接跳到这里。    动 scroll-margin 让吸顶标题栏不盖住窗口标题（样式见 xp-custom.css）。
*/
hexo.extend.helper.register('xp_widget_todo', (n) => widget('争取在死之前做完', todoMini(n == null ? 5 : n), 'xp-widget-todo', 'xp-todo'));
hexo.extend.helper.register('xp_meta', (post) => metaOf(post));
hexo.extend.helper.register('xp_words', function (post) { return wordChip(this, post); });

/* 两侧装饰图（2026-10-13 数据驱动， 026-10-19 起支持随机纵向位置），    说 _data/decor.yml，每项输出一张固定定位的图。张数不限；yml 缺失或列表为空就什么都不输出。    两种定位模式（可按项混用）：
     · 写了 top:  —— 固定模式，原样输出（老用法不变），      · random: true —— 随机模式：构建期只输出图片清单与展示宽度（        距顶距离由运行时 JS（xp-decor-random.js）在**每次刷新**时随机分配。        层级 z-index:0：背景之上、正文窗口之下（站主指定）。    CSS， xp-decor）只管「宽屏才显示、不挡点击」这些通用规则。
*/
hexo.extend.helper.register('xp_decor', () => {
  let items = [];
  try { items = dataFile('decor').items || []; } catch (e) { items = []; }
  if (!Array.isArray(items) || !items.length) return '';
  const imgs = items.filter((it) => it && it.image).map((it) => {
    const side = it.side === 'right' ? 'right' : 'left';
    const random = it.random === true;
    const top = random ? '' :
      (/^\d+(px|%)$/.test(String(it.top || '')) ? String(it.top) : '120px');
    const width = Math.min(Math.max(Number(it.width) || 160, 40), 400);
    /* 2026-10-17：补 width/height 属性（按图片真实宽高），否则图下载完之前浏览器
       不知道它要占多高，宽屏上会出现一次轻微的内容跳动（CLS）。高宽比按实除        文件取，取不到就按 1:1 估，height 只在 CSS 没定高时起作用，不会改变外观。
*/
    const [w0, h0] = imageSize(it.image, width, width);
    const style = random
      ? `${side}: 10px; width: ${width}px;`
      : `${side}: 10px; top: ${esc(top)}; width: ${width}px;`;
    const cls = random ? 'xp-decor xp-decor-rand' : 'xp-decor';
    return `<img class="${cls}" src="${esc(it.image)}" alt="" aria-hidden="true" loading="lazy" decoding="async" width="${w0}" height="${h0}" style="${style}">`;
  });
  /* 有随机项时才注入随机脚本（defer 外链，全站共享缓存；脚本本体在下面 routeJs） */
  const needRand = items.some((it) => it && it.random === true);
  const randScript = needRand ? '<script src="/js/xp-decor-random.js" defer></script>' : '';
  return oneLine(imgs.join('')) + randScript;
});

/* 随机纵向位置脚本， 026-10-19）：给所有 .xp-decor-rand 每次刷新随机分配 top。    规则：把视口高度均分成 N 段（N=随机图张数，两侧分别算），    每张图领一段再在段内取随机点 —— 保证图与图之间不会叠在一起，
   也不会全部挤到同一屏位置。图片高度未知时按宽度估（宽 160 的方图≈高 160）。
*/
routeJs(hexo, '/js/xp-decor-random.js', () => `
(function () {
  if (window.__XP_DECOR_RAND__) return;
  window.__XP_DECOR_RAND__ = true;
  function place() {
    var imgs = document.querySelectorAll('.xp-decor-rand');
    if (!imgs.length) return;
    var vh = window.innerHeight || 800;
    var bySide = { left: [], right: [] };
    imgs.forEach(function (img) {
      var side = img.style.left ? 'left' : 'right';
      bySide[side].push(img);
    });
    Object.keys(bySide).forEach(function (side) {
      var list = bySide[side];
      if (!list.length) return;
      var seg = vh / list.length;               /* 每张图分到一段 */
      list.forEach(function (img, i) {
        var w = parseFloat(img.style.width) || 160;
        var estH = w * ((img.naturalHeight || 1) / (img.naturalWidth || 1)) || w;
        estH = Math.min(estH, seg);             /* 图比段高就按段高算，留出空隙 */
        var lo = i * seg;
        var hi = (i + 1) * seg - estH;
        img.style.top = Math.floor(lo + Math.random() * Math.max(1, hi - lo)) + 'px';
      });
    });
  }
  place();
  window.addEventListener('resize', place);     /* 转屏/拉窗口重排一次 */
})();`);

/* 窗口按钮交互：min 折叠 / max 全宽切换 / close 隐藏（可恢复，    注入到每个页面 footer，给所有 .xp-window-btn 绑定点击事件。    和播放器解耦——只负责窗口操作，不管音乐。    2026-11 外链化：脚本本体是常量（无页面数据），走 routeJs 输出 /js/xp-win-actions.js）    helper 只留一行 <script src>（defer 加载），每页 HTML 看 ~3.5KB。
*/
routeJs(hexo, '/js/xp-win-actions.js', () => `
(function(){
  if (window.__XP_WIN_ACTIONS__) return;
  window.__XP_WIN_ACTIONS__ = true;

  /* 全站窗口统一补齐右上角三按钮， 026-10-13）：
     模板里没写按钮组的窗口（侧栏卡片、各页面窗口等）在这里一次性补上，
     已经有按钮组的窗口跳过。交互不用逐个绑定 —— 走下面的 document 事件委托，      新插入的按钮天然可用，键目 Enter/Space 也一样。
*/
  (function fillWindowButtons() {
    var MIN = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="7" width="8" height="2" fill="currentColor"/></svg>';
    var MAX = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
    var CLOSE = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>';
    document.querySelectorAll('.xp-window').forEach(function (win) {
      var title = win.querySelector('.xp-window-title');
      if (!title || title.querySelector('.xp-window-btns')) return;
      var span = document.createElement('span');
      span.className = 'xp-window-btns';
      span.setAttribute('role', 'group');
      span.setAttribute('aria-label', '窗口操作');
      span.innerHTML =
        '<i class="xp-window-btn" data-action="min" role="button" tabindex="0" aria-label="最小化">' + MIN + '</i>' +
        '<i class="xp-window-btn" data-action="max" role="button" tabindex="0" aria-label="最大化">' + MAX + '</i>' +
        '<i class="xp-window-btn close" data-action="close" role="button" tabindex="0" aria-label="关闭">' + CLOSE + '</i>';
      title.appendChild(span);
    });
  })();

  /* close 不再一关了之（2026-10-12 审查新增）：XP 原语义是「关闭直到刷新」，
     误点一次窗口就回不来。现在关闭后在左下角（任务栏上方）留一枚「恢复」chip，      点一下窗口就回来；多关几个就叠几枚，全部恢复后条自动消失（CSS :empty 隐藏）。
*/
  function restoreBar() {
    var bar = document.getElementById('xp-restore-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'xp-restore-bar';
      document.body.appendChild(bar);
    }
    return bar;
  }
  function titleOf(win) {
    var t = win.querySelector('.xp-window-title-text, .xp-window-title');
    return (t && t.textContent || '').trim() || '窗口';
  }
  function closeWindow(win) {
    if (win.hasAttribute('data-xp-closed')) return;
    win.setAttribute('data-xp-closed', '1');
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'xp-restore-chip';
    var name = titleOf(win);
    chip.textContent = '恢复。' + name + '。';
    chip.title = name + ' —— 点击恢复窗口';
    chip.setAttribute('aria-label', '恢复窗口 ' + name);
    chip.addEventListener('click', function () {
      win.removeAttribute('data-xp-closed');
      chip.remove();
    });
    restoreBar().appendChild(chip);
  }

  function act(btn) {
    /* data-xp-local = 临时浮层（邮箱弹窗、关机错误窗）的豁免标记，        它们自带关闭逻辑，绝不能进「最小化/恢复 chip」这套常驻窗口流程，
       否则关掉浮层后左下角会冒出一个多余的「恢复」按钮（2026-10-14 实测踩过）。
*/
    if (btn.getAttribute('data-xp-local')) return;
    var win = btn.closest('.xp-window');
    if (!win) return;
    var a = btn.getAttribute('data-action');
    if (a === 'min') win.classList.toggle('is-minimized');
    else if (a === 'max') win.classList.toggle('is-maximized');
    else if (a === 'close') closeWindow(win);
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('.xp-window-btn') : null;
    if (b) act(b);
  });
  /* 键盘操作：Enter / Space 触发 */
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var b = document.activeElement;
    if (b && b.classList && b.classList.contains('xp-window-btn')) {
      e.preventDefault(); act(b);
    }
  });
})();
`);
hexo.extend.helper.register('xp_window_actions', () =>
  '<script src="/js/xp-win-actions.js" defer></script>');
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

/* 「相关文章」helper（按同分类 / 同标签打分）已按站主要求删除：文章底部只留    上一篇 / 下一篇（按时间的相邻两篇，模板里直接用 page.prev / page.next 渲染）。    想要找回这段逻辑，看 git 历史即可。
*/

/* 置顶标记：front matter 里 sticky 有值就在卡片标题右侧画一个「到顶」箭头。    纯静态字符串（无用户数据），颜色交给 CSS 的 .xp-pin 控制。
*/
const pinMark = () => (
  '<span class="xp-pin" title="置顶" aria-label="置顶">' +
  '<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<use href="#icon-pin"/>' +
  '</svg></span>'
);

/* 加密标记：front matter 里写了 password 的文章，在标题右侧画一个锁。    和置顶箭头同一套做法（点阵图案 + 交给 CSS 定位），
   两个都出现时并排显示（见 .xp-pin/.xp-lock 的 margin）。
*/
const lockMark = () => (
  '<span class="xp-lock" title="需要密码" aria-label="需要密码">' +
  '<svg width="1.15em" height="1.15em" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<use href="#icon-lock"/>' +
  '</svg></span>'
);

/* 一篇文章是否加密（hexo-blog-encrypt 认的就是 front matter 的 password，
*/
const isLocked = (post) => Boolean(post && post.password);

/* 弱口令提醒（2026-10-22 安全审查新增）。    为什么需要：加密参数本身很强（hexo-blog-encrypt 用 PBKDF2-HMAC-SHA256 25 万轮 +
   AES-256-GCM，见 node_modules/hexo-blog-encrypt/src/server/crypto.js:8-14），
   但口令空间太小时这一切都白搭 —— 4 位纯数字只有 1 万种组合，    在消费级显卡上是「秒级」量级。    这里**只提醒、不阻断构建**：站主可能就是想给一篇随手文章设一    「别让路过的人随便看见」级别的锁，那 4 位数字完全够用，不该逼他改。
*/
const WEAK_PW_MIN = 8;
function weakPasswordReason(raw) {
  /* password 可以是 { env: '变量名' } 这种从环境变量读的写法（README 5.1），
     真值在构建期才知道，这里不去碰宽 */
  if (raw && typeof raw === 'object') return '';
  const s = String(raw);
  if (s.length >= WEAK_PW_MIN) return '';
  if (/^\d+$/.test(s)) {
    return '纯数字 ' + s.length + ' 位，只有 ' + Math.pow(10, s.length) + ' 种组合';
  }
  return '只有 ' + s.length + ' 位';
}
hexo.extend.filter.register('after_post_render', (data) => {
  if (!data || !data.password) return;
  const reason = weakPasswordReason(data.password);
  if (!reason) return;
  /* 轮数从 _config.yml 的 encrypt.kdf.iterations 读，别写死 ——      写死的后果是改配置后警告里还印着旧数字（2026-10-22 我就先写死了 250000）      把配置提到 600000 之后那句提示仍然说 250000）。
*/
  const cfg = (hexo.config && hexo.config.encrypt) || {};
  const iter = (cfg.kdf && Number(cfg.kdf.iterations)) || 250000;
  hexo.log.warn('[xp-content] 加密文章「%s」的密码偏弱（%s）。' +
    'PBKDF2 有 %d 轮也挡不住爆破，建议 %d 位以上混合字符。仅提醒，不影响构建。',
    data.title || data.source || '?', reason, iter, WEAK_PW_MIN);
});

/* 加密了就返回锁形图标，否则空字符一 —— 让模板里少写一层三全 */
const lockMarkIf = (post) => (isLocked(post) ? lockMark() : '');

/* ---------------------------------------------------------------- 点赞（本地点赞） */
/* 为什么是「本地点赞」而不是真的计数：
   本站是 GitHub Pages 纯静态站，没有服务端也没有数据库 —— 点赞数这类    **需要存储的数据本站自己存不了 *。三种做法里选了这个，      · 本地点赞（现在这样）：计数只存在**访客自己的浏览器**（localStorage），
       刷新/重开都还在，但不同设备互不相通，站点管理员也看不到总数。        好处是零成本、零依赖、不收集任何个人信息、不产生 UGC —— 没有合规负担。      · 第三方托管（Twikoo / Waline / Gitalk）：才能做到"所有人看到同一个数字 （        但要部署后端、要按 UGC 的要求做内容管理与备案（详见 README 第 12 节）。      · 纯展示假数字：不推荐，会骗到你自己。    ⚠ 以后要换成第三方托管，只需改这个函数 + xp-like-driver 里的两个钩子
     （见下面的 window.XPLikeBackend），页面结构不用动。
*/
function likeBlock(post, opts) {
  if (!post || !post.path) return '';
  const o = opts || {};
  /* 加密文章不加点赞：内容都没读，赞了没意义 */
  if (isLocked(post)) return '';
  const key = likeKey(post);
  const size = o.compact ? 14 : 16;
  return oneLine(
    `<button type="button" class="xp-like${o.compact ? ' xp-like-compact' : ''}" ` +
    `data-like-key="${esc(key)}" aria-pressed="false" title="点赞（存在你自己的浏览器里）">` +
    /* 爱心是两张点阵图（灰心 / 红心），面 .is-liked 切换显示，        不再用 currentColor 描边 —— 点阵图颜色是烘死的。
*/
    `<svg class="xp-like-ico xp-like-ico-off" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><use href="#icon-like-off"/></svg>` +
    `<svg class="xp-like-ico xp-like-ico-on" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><use href="#icon-like-on"/></svg>` +
    `<span class="xp-like-count" data-like-count>0</span>` +
    /* 文字标签：卡片是紧凑版（只有爱心+数字），文章页才显示「点起 取消赞」几个字 */
    (o.compact ? '' : '<span class="xp-like-label">点赞</span>') +
    `</button>`
  );
}

/* 点赞的存储键：用文章路径，改标题不会丢赞 */
function likeKey(post) {
  return 'xp_like:' + String(post.path || '');
}

hexo.extend.helper.register('xp_like', function (post) { return likeBlock(post); });

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
      `<h2 class="xp-post-card-title">${esc(p.title)}${lockMarkIf(p)}${p.sticky ? pinMark() : ''}</h2>` +
      `<span class="xp-post-card-excerpt">${esc(excerptOf(p, 96))}</span>` +
      `<span class="xp-post-card-meta">` +
      `<span class="xp-chip">${fmtDate(p)}</span>` +
      `<span class="xp-chip primary">${esc(metaOf(p))}</span>` +
      wordChip(this, p) +
      likeBlock(p, { compact: true }) +
      `</span></span></a>`
    );
  });
  return oneLine(`<div class="xp-card-list">${cards.join('')}</div>`);
});

/* 标签 / 分类索引页（同时注册成 helper 一 markdown 标签，两处复用同一份实现）。    两类页面结构相同，只差数据源（allTags / allCategories），抽成一个函数。
*/
function indexGridHtml(items, emptyText) {
  if (!items.length) return `<p class="xp-empty">${emptyText}</p>`;
  const cells = items.map((t) => (
    `<a class="xp-index-item" href="${href(t.path)}"><span class="name">${esc(t.name)}</span>` +
    `<span class="count">${t.length} 篇</span></a>`
  ));
  return oneLine(`<div class="xp-index-grid">${cells.join('')}</div>`);
}

function tagIndexHtml() {
  return indexGridHtml(allTags(), '还没有标签');
}

function categoryIndexHtml() {
  /* allCategories 已按「篇数降度 + 名字」排好，这里保持旧的纯篇数降序语也 */
  const cats = allCategories().slice().sort((a, b) => b.length - a.length);
  return indexGridHtml(cats, '还没有分类');
}

hexo.extend.helper.register('xp_tag_index', () => tagIndexHtml());
hexo.extend.helper.register('xp_category_index', () => categoryIndexHtml());
registerTag('xp_tag_index', () => tagIndexHtml());
registerTag('xp_category_index', () => categoryIndexHtml());

/* ---------------------------------------------------------------- 身份信息（profile.yml，
*/
/* 名字、介绍、按钮、联系方式都从这里读，页面里只放 {% xp_profile — %} 标签。    支持点号路径，例如 {% xp_profile about.title %}。
*/
function profileData() {
  const raw = dataFile('profile');
  return Array.isArray(raw) ? {} : (raw || {});
}

function profileValue(key) {
  return String(key || '').split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), profileData());
}

/* 胶囊：既支持 { key: works, label: 作品 }（数字由站点统计），
   也支按 { value: "∞", label: 灵感 }，以只 about.chips 里那种纯字符一 */
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

/* 首页大标题用的网名：profile.yml 的 names 列表（第一个兼作主名）。    没配 names 就退回旧的单一 name / 站点作者。
*/
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

/* 首页大标题整体：「 网名> 来了！」；多个网名时附带轮换配置（脚本在页面底部统一处理） */
hexo.extend.tag.register('xp_profile_title', () => {
  const list = profileNames();
  const suffix = profileValue('name_suffix') || '来了，';
  const rotate = Number(profileValue('name_rotate_seconds')) || 0;
  const cfg = (list.length > 1 || rotate > 0)
    ? ` data-names="${esc(JSON.stringify(list))}" data-rotate="${rotate}"`
    : '';
  return oneLine(`<span class="username" id="xpName"${cfg}>${esc(list[0] || '')}</span> ${esc(suffix)}`);
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

/* 首页图标行：全部改用 scripts/xp-icons.js 的点阵图案（方案全 立体浮雕），
   和标题栏 / 任务栏 / 正文里的图标同一套色板、同一种像素厚度。    以前这里放的是 simple-icons 的单色路径（GitHub / B 站 / X / 微博 / Pixiv 的官文    标志轮廓），那些形状的著作权属于各平台，个人博客长期使用有争议风险；现在改成
   自己画的像素化「品牌联想图形」——一眼认得出是哪个平台，但笔触是原创点阵。    svg 字段只留 symbol 名，真正渲染时由 #icon-social-* 引用 sprite。
*/
const PROFILE_ICONS = {
  github: { label: 'GitHub', glyph: 'icon-social-github' },
  email: { label: '邮箱', glyph: 'icon-social-email' },
  bilibili: { label: '哔哩哔哩', glyph: 'icon-social-bilibili' },
  xiaohongshu: { label: '小红书', glyph: 'icon-social-redbook' },
  x: { label: 'X', glyph: 'icon-social-x' },
  weibo: { label: '微博', glyph: 'icon-social-weibo' },
  pixiv: { label: 'Pixiv', glyph: 'icon-social-pixiv' },
  website: { label: '个人站点', glyph: 'icon-social-web' }
};

/* 缺图案要在构建期就炸，别等到线上渲染出一个空方块 */
for (const k of Object.keys(PROFILE_ICONS)) {
  if (!PIX_GLYPHS[PROFILE_ICONS[k].glyph]) {
    throw new Error(`xp-content: xp-icons.js 里没有图案 "${PROFILE_ICONS[k].glyph}"`);
  }
}

/* 邮箱：支持单个字符串，也支持列表。列表项四种写法都认，      - me@example.com                    纯地址
     - 个人：me@example.com              字符串里带标签（全角/半角冒号都行）      - { 个人: me@example.com }          YAML 映射
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

/* 只渲染 profile.yml 里填了地址的平台。    邮箱：只有一个地址时，图标直接就是 mailto 链接；         有多个地址时，点击图标弹出一个列出所有地址的小窗（见 xp-enhance.js）。
*/
hexo.extend.tag.register('xp_profile_icons', () => {
  const contacts = profileData().contacts || {};
  const emails = profileEmails();
  const html = Object.keys(PROFILE_ICONS).filter((k) => {
    if (k === 'email') return emails.length > 0;
    /* 用 trim 判空：只填了空格也算没填，否则会渲成一一 href=" " 的死链 */
    return Boolean(String(contacts[k] || '').trim());
  }).map((k) => {
    const icon = PROFILE_ICONS[k];
    if (k === 'email') {
      const tip = emails.length > 1 ? `邮箱（共 ${emails.length} 个，点击查看）` : icon.label;
      return `<a class="profile-icon" href="mailto:${esc(emails[0].address)}" id="xpEmailBtn" ` +
        `aria-haspopup="${emails.length > 1 ? 'dialog' : 'false'}" aria-expanded="false" ` +
        `title="${esc(tip)}" aria-label="${esc(icon.label)}"><svg class="profile-icon-pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#${icon.glyph}"></use></svg></a>`;
    }
    return `<a class="profile-icon" href="${esc(contacts[k])}" target="_blank" rel="noopener" ` +
      `title="${icon.label}" aria-label="${icon.label}"><svg class="profile-icon-pix" viewBox="0 0 16 16" aria-hidden="true"><use href="#${icon.glyph}"></use></svg></a>`;
  });

  /* 多个邮箱时附带一个隐藏的小窗 + 弹出逻辑（定位用 fixed，避免被窗口的 overflow 裁掉）
*/
  if (emails.length > 1) {
    const hint = profileValue('about.contact_desc');
    const items = emails.map((e) => (
      `<a class="pop-email" href="mailto:${esc(e.address)}">` +
      (e.label ? `<span class="email-label">${esc(e.label)}</span>` : '') +
      `<span class="email-address">${esc(e.address)}</span></a>`
    ));
    html.push(
      /* 弹窗直接用 *站点标准窗口结构**，
xp-window / .xp-window-title / .xp-window-btn），
         2026-10-14 站主要求与全站统一 —— 原来自绘的细标题标 + 小红叉已废弃。          ⚠ 关闭按钮**不带 data-action**，但带 data-xp-local="1"，            页面里有个通用窗口处理器会拦截所有 .xp-window-btn（做最小化/恢复那套），
           弹窗是临时浮层，不能被它接管 —— data-xp-local 就是给它的豁免标计            （错误弹窗踩过同一个坑，见 xp-taskbar.js）。
*/
      `<div class="profile-email-pop xp-window" id="xpEmailPop" role="dialog" aria-label="邮箱地址" hidden>` +
      `<div class="xp-window-title"><span class="xp-window-title-text">邮箱</span>` +
      `<span class="xp-window-btns"><i class="pop-close xp-window-btn close" data-action="close" data-xp-local="1" role="button" tabindex="0" aria-label="关闭">` +
      `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.4" fill="none"/></svg></i></span></div>` +
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
/* {% xp_apps game %} 仍是"只要卡片"（老写法）；{% xp_apps pane game %} 才出一整块窗口 */
registerTag('xp_apps', (args) => {
  const a = (args || []).map((s) => String(s).trim());
  if (a[0] === 'pane') return appsPane(a[1], a[2] === 'tools' ? 'tools' : 'games');
  if (a[0] === 'cards') return appsCards(a[1]);
  return appsCards(a[0]);
});
registerTag('xp_guides', () => guidesList());
registerTag('xp_work_gallery', () => workGallery());

/* 文章页标题栏右侧的装饰按钮（`_ ▣ ×`）——模板里用 xp_bullet() 取。    （这里原来还注册过一一 xp_todo_mini：待办窗口改用 index.ejs 直接谢 xp_widget_todo()
     之后它就没有调用方了，已删。） */
hexo.extend.helper.register('xp_bullet', () => BULLET);
hexo.extend.helper.register('xp_num_of', (key) => num(key));
