/* 站点级 SEO：sitemap.xml + robots.txt（2026-11-05 站主按优先度批准的第二项）
   ------------------------------------------------------------------
   为什么不装 hexo-generator-sitemap：本站页面结构很规整（文章 + 少量独立页
   + 分类/标签/归档），自己遍历 locals 比多一个依赖更可控，也能顺手把
   跳转桩排除掉。

   ⚠ 一个必须记住的坑：generator 里 **不能** 用 this.route.list() 去收集页面。
     generator 的执行顺序是「先把所有 generator 跑完、收集结果，再统一注册路由」，
     所以在某个 generator 内部 route.list() 只能看到 source/ 下的静态文件，
     看不到别的 generator 产出的 HTML —— 实测只拿到 1 条（首页）。
     正确做法是从 locals 拿 posts / pages / categories / tags，自己拼地址。

   URL 一律用 config.url 拼绝对地址（sitemap 协议要求绝对 URL）。 */

'use strict';

const ISO = (d) => {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t.getTime()) ? '' : t.toISOString();
};

const xmlEsc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

hexo.extend.generator.register('xp-seo', function () {
  const cfg = this.config;
  const site = String(cfg.url || '').replace(/\/+$/, '');
  /* 把任意形状的内部路径归一成 sitemap 里的规范 URL：
       · 连续斜杠压成一个（posts 的 path 有的带前导 / 有的不带）
       · 结尾的 index.html 去掉，目录补回一个斜杠
       · 中文等字符做百分号编码（sitemap 协议要求 URL 是合法的 ASCII URI，
         直接放汉字虽然多数爬虫能认，但严格校验会报错）
     例：'//about-me/' → '/about-me/'；'index.html' → '/'；'tags/生活//' → '/tags/%E7%94%9F%E6%B4%BB/' */
  const norm = (p) => {
    let s = String(p || '').trim();
    s = s.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    s = s.replace(/\/?index\.html$/i, '/');
    if (s.charAt(0) !== '/') s = '/' + s;
    /* ⚠ 只给「目录」补结尾斜杠。带扩展名的文件（/sitemap.xml、/atom.xml）不能补 ——
       实测踩过：robots.txt 里的 Sitemap 行变成 https://…/sitemap.xml/，末尾多一个斜杠，
       严格校验的爬虫会当成另一个不存在的地址。 */
    const isFile = /\/[^/]+\.[a-z0-9]{1,8}$/i.test(s);
    if (!isFile && s.length > 1 && s.charAt(s.length - 1) !== '/') s += '/';
    /* 逐段编码，保留斜杠；encodeURIComponent 会把中文变成 %E7… */
    return s.split('/').map((seg) => encodeURIComponent(seg)).join('/');
  };
  const abs = (p) => site + norm(p);

  const rows = [];   /* { loc, lastmod, changefreq, priority } */

  /* ① 首页 */
  rows.push({ loc: abs('/'), changefreq: 'daily', priority: '1.0' });

  /* ② 文章页 —— lastmod 用 updated（hexo 会回落到 date） */
  const posts = this.locals.get('posts').toArray();
  posts.forEach((p) => {
    rows.push({
      loc: abs('/' + p.path),
      lastmod: ISO(p.updated || p.date),
      changefreq: 'monthly',
      priority: '0.7',
    });
  });

  /* ③ 独立页（/blog/ /works/ /games/ /tags/ /categories/ /thanks/ …）
     ⚠ pages 里混着 source/ 下的静态资源：实测有 APlayer.min.css/.js、
       css/xp-custom.css、vendor/xp-css/XP.css 四项（title 为空）。
       它们不是可索引的页面，混进 sitemap 会让爬虫去抓样式表。
       Hexo 的页面模型 path 一律以 index.html 结尾，资源则不带 —— 按这个过滤。
       404 页也排除：它没有可检索内容，收录只会稀释站点质量。 */
  const pages = this.locals.get('pages').toArray();
  pages.forEach((p) => {
    if (!p.path || !/index\.html$/i.test(p.path)) return;
    if (/^404\.html$/i.test(p.path) || /\/404\.html$/i.test(p.path)) return;
    rows.push({
      loc: abs('/' + p.path),
      lastmod: ISO(p.updated || p.date),
      changefreq: 'weekly',
      priority: '0.8',
    });
  });

  /* ④ 分类 / 标签 / 归档索引与它们的子页
     这几类页面没有自己的时间，省略 lastmod（协议里 lastmod 可省）。
     ⚠ category.path / tag.path 里已经带上了 category_dir / tag_dir 前缀
       （形如 `categories/作品`、`tags/生活`），所以这里只补一个前导斜杠；
       再拼一次目录名会得到 /tags/tags/生活/ 这种 404 地址。 */
  const cats = this.locals.get('categories').toArray();
  cats.forEach((c) => {
    if (!c.length) return;                 /* 空分类不收录 */
    rows.push({ loc: abs('/' + c.path + '/'), changefreq: 'weekly', priority: '0.5' });
  });
  const tags = this.locals.get('tags').toArray();
  tags.forEach((t) => {
    if (!t.length) return;
    rows.push({ loc: abs('/' + t.path + '/'), changefreq: 'weekly', priority: '0.4' });
  });

  /* ⑤ 归档（索引 / 年 / 年-月）
     ⚠ 月度子页必须跟着 archive_generator.monthly 走。2026-11-07 把月归档
       关掉（_config.yml）之后，这段原本仍按文章日期算 URL 写进 sitemap，
       等于主动把爬虫引到 4 个 404。sitemap 是照着生成器的开关手算的，
       两边必须同步 —— 改任一处的归档配置，回来核对这里。 */
  const archiveDir = cfg.archive_dir || 'archives';
  rows.push({ loc: abs('/' + archiveDir + '/'), changefreq: 'weekly', priority: '0.6' });
  const genMonthly = (cfg.archive_generator || {}).monthly !== false;
  const months = new Set();
  const years = new Set();
  posts.forEach((p) => {
    const d = new Date(p.date);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    years.add(String(y));
    if (genMonthly) months.add(y + '/' + m);
  });
  years.forEach((y) => {
    rows.push({ loc: abs('/' + archiveDir + '/' + y + '/'), changefreq: 'weekly', priority: '0.4' });
  });
  months.forEach((ym) => {
    rows.push({ loc: abs('/' + archiveDir + '/' + ym + '/'), changefreq: 'monthly', priority: '0.3' });
  });

  /* 去重（分类的 path 里带层级，与 tags 不会撞；保险起见还是做一次） */
  const seen = new Set();
  const uniq = [];
  rows.forEach((r) => {
    if (seen.has(r.loc)) return;
    seen.add(r.loc);
    uniq.push(r);
  });

  const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    .concat(uniq.map((r) => [
      '  <url>',
      '    <loc>' + xmlEsc(r.loc) + '</loc>',
      r.lastmod ? '    <lastmod>' + r.lastmod + '</lastmod>' : '',
      r.changefreq ? '    <changefreq>' + r.changefreq + '</changefreq>' : '',
      r.priority ? '    <priority>' + r.priority + '</priority>' : '',
      '  </url>',
    ].filter(Boolean).join('\n')))
    .concat(['</urlset>', ''])
    .join('\n');

  /* robots.txt：允许全站抓取；跳转桩与搜索索引不进检索结果。
     不放 Crawl-delay（各家支持不一，反而会被当成限制抓取）。 */
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /tools/',
    'Disallow: /guides/',
    'Disallow: /search.json',
    '',
    'Sitemap: ' + abs('/sitemap.xml'),
    '',
  ].join('\n');

  return [
    { path: 'sitemap.xml', data: xml },
    { path: 'robots.txt', data: robots },
  ];
});
