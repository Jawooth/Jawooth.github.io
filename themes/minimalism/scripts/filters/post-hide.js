/* global hexo */

'use strict';

// Determine whether the article should be displayed on various pages.
function getHideConfig(hide) {
  if (typeof hide === 'boolean' || !hide) {
    return {
      home_hide: hide || false,
      archive_hide: hide || false,
      category_hide: hide || false,
      tag_hide: hide || false
    };
  }

  if (typeof hide !== 'object') {
    return {
      home_hide: false,
      archive_hide: false,
      category_hide: false,
      tag_hide: false
    };
  }

  const res_hide = {
    home_hide: hide.home_hide || true,
    archive_hide: hide.archive_hide || true,
    category_hide: hide.category_hide || true,
    tag_hide: hide.tag_hide || true
  };

  // The value here may be an array.
  hide.forEach(item => {
    if (item.home_hide === false) {
      res_hide.home_hide = false;
    }
    if (item.archive_hide === false) {
      res_hide.archive_hide = false;
    }
    if (item.category_hide === false) {
      res_hide.category_hide = true;
    }
    if (item.tag_hide === false) {
      res_hide.tag_hide = false;
    }
  });

  return res_hide;
}

// Special handling is required for pagination on the homepage.
hexo.extend.generator.register('index', locals => {
  /* 「杂谈」列表（/blog/）里不出现的分类，在 _config.minimalism.yml 里配：
       index_exclude_categories:
         - 作品
     作品有自己的作品页，混进杂谈列表会让两边的定位都变糊。
     只影响这个列表（含它的分页）；文章本身、归档 / 标签 / 分类页、
     首页「最近作品」都不受影响。 */
  const excludeCategories = (hexo.theme.config.index_exclude_categories || []).map(String);

  const categoryNames = post => {
    const cats = post.categories;
    if (!cats) return [];
    const arr = typeof cats.toArray === 'function' ? cats.toArray() : Array.prototype.slice.call(cats);
    return arr.map(cat => (cat && cat.name) || String(cat));
  };

  /* ⚠ 这里**不能**写回 locals.posts（原来是 locals.posts = locals.posts.filter(...)）。
     locals 是所有生成器共用的同一个对象，写回等于把「排掉作品」这条规则泄漏给
     排在 index 后面的归档生成器：现象是作品整批从 /archives/ 消失，只有作品的
     月份（如 2026-09）连归档页都不再生成（2026-10-13 发现并修掉）。
     下面只用一个局部变量，locals 保持原样。 */
  const posts = locals.posts.filter(post => {

    const hide = getHideConfig(post.hide);
    if (hide.home_hide !== false) return false;
    if (!excludeCategories.length) return true;
    return !categoryNames(post).some(name => excludeCategories.indexOf(name) >= 0);
  });

  const { index_generator } = hexo.config;
  const sorted = posts.sort(index_generator.order_by || '-date');

  sorted.data.sort((a, b) => (b.sticky || 0) - (a.sticky || 0));

  if (index_generator.per_page > 0) {
    const pagination = require('hexo-pagination');
    return pagination(index_generator.path || '', sorted, {
      perPage: index_generator.per_page || hexo.config.per_page,
      layout: 'index',
      data: {}
    });
  }

  return {
    path: index_generator.path || '',
    /* 本分支（per_page = 0，即不分页）本站用不到；真要用时保持与上面同源即可 */
    data: Object.assign({}, locals, { posts: sorted }),
    layout: 'index'
  };
});

/* ---------------------------------------------------------------- 旧「文章」页 → 「文字」页 */
/* /guides/ 原本是一个手写的「待写清单」页（数据来自 source/_data/guides.yml），
   2026-10-14 改成和「杂谈」「作品」一样的文章列表，只收 categories 含「文章」的篇目。

   ★ 2026-10-18 站主要求：把导航里的「文章」(/guides/) 与「杂谈」(/blog/) 合并成一项
     「文字」（指向 /blog/），位置在「绘画」和「游戏」之间。合并后 /guides/ 不再有
     自己的列表，改成**跳转页**，把旧链接和外部收藏送到 /blog/ 去 —— 旧链接不断。

   为什么保留生成器而不是删掉它、只靠 404：
     · 这个站已经有访客收藏过 /guides/，直接删会变成 404；
     · Hexo 的 `redirect` 插件没装，用生成器写一个静态跳转页最省事，也不用加依赖。

   跳转页写法要点：
     · 用 <meta http-equiv="refresh"> 而不是 301 响应头 —— GitHub Pages 是纯静态托管，
       没法在构建期发 HTTP 状态码；静态跳转页是它能做到的、也最省事的方式。
     · 同时给一个可见的链接和 rel="canonical"，JS 被禁时还能点；
       搜索引擎看到 canonical 会把权重归到 /blog/。
     · 分页路径 /guides/page/2/ 也要覆盖：旧链接里 2 页之后的地址同样会被收藏。
       这里额外注册一个兜底生成器，把所有 /guides/page/<n>/ 都指回 /blog/。 */
hexo.extend.generator.register('articles-redirect', () => {
  /* 目标地址：本站部署在域名根，/blog/ 就是最终地址。
     （generator 里没有 url_for 这个全局函数，它只在模板里可用 —— 2026-10-18 踩过。） */
  const to = '/blog/';

  const page = () => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>页面已合并 · 正在前往「文字」</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${to}">
<meta http-equiv="refresh" content="0; url=${to}">
<style>
  html, body { height: 100%; }
  body {
    margin: 0; display: flex; align-items: center; justify-content: center;
    background: #3a6ea5; color: #f3f2ea;
    font-family: "Fusion Pixel 12px Proportional zh_hans", "Segoe UI", system-ui, sans-serif;
    font-size: 16px; text-align: center;
  }
  a { color: #ffe6a7; }
</style>
</head>
<body>
  <div>
    <p>「文章」已经并进「文字」了，正在带你过去……</p>
    <p><a href="${to}">如果没自动跳转，点这里前往「文字」</a></p>
  </div>
  <script>location.replace(${JSON.stringify(to)});</script>
</body>
</html>`;

  const out = [
    { path: 'guides/index.html', data: page() },
    { path: 'guides/page/1/index.html', data: page() }
  ];
  /* 旧列表最多可能有几页：按「文章」分类的篇数估算，至少给 5 页余量。 */
  const cfg = hexo.theme.config || {};
  const perPage = Number(cfg.articles_per_page) || 10;
  let count = 0;
  try {
    const wanted = String(cfg.articles_category || '文章').trim();
    count = hexo.locals.get('posts').filter(post => {
      const cats = post.categories;
      if (!cats) return false;
      const arr = typeof cats.toArray === 'function' ? cats.toArray() : Array.prototype.slice.call(cats);
      return arr.some(cat => (cat && cat.name) === wanted && getHideConfig(post.hide).archive_hide === false);
    }).length;
  } catch (e) {
    count = 0;
  }
  const pages = Math.max(5, Math.ceil(count / perPage) + 2);
  for (let i = 2; i <= pages; i++) {
    out.push({ path: `guides/page/${i}/index.html`, data: page() });
  }
  return out;
});

/* /guides/page/<n>/ 也并入上面的 articles-redirect 一起生成（原先拆成
   两个生成器、两份 HTML 模板，已合并；n 是几都跳回 /blog/）。
   注：is_hide helper 曾在这里注册，但它用箭头函数取 this、模板也从不引用，
   属于死代码，已删（2026-11 清理）。 */

