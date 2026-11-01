/* global hexo */
/**
 * 构建期增强（外壳结构已移到主题模板，这里只做模板做不到的事）
 *   1. 正文图片补原生 loading="lazy" / decoding="async" + width/height（防布局位移）
 *   2. 文章页注入：图片点击放大 + 目录跟随滚动高亮
 *   3. <title> 补站点名、head 补 canonical 与 og:url / og:type
 *
 * 历史：早期版本在这里用字符串替换给文章/列表页注入 XP 窗口外壳，
 * 一旦主题模板结构变化（例如文章带 hero 图）正则就会匹配失败而静默失效。
 * 现在结构由 themes/minimalism/layout/{post,page,index,archive,tag}.ejs 直接产出。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITE_TITLE = (hexo.config && hexo.config.title) || '';
/* ⚠ 这里的兜底是空串，和 scripts/xp-taskbar.js 里的 '我的小站' 不一样，不是写错了：
   本站 413 行的 `if (SITE_TITLE)` 用它当「开关」——config.title 没配就不往
   <title> 里补站点名。taskbar 那边是给关机对话框用的显示文案，空串会难看到，
   所以填了个默认值。两处语义不同，不要为了「统一」把它们改成一样。 */
const SEP = ' | ';

/* 给样式表链接加内容版本号。
   原因：样式文件的 URL 一直没变，浏览器会拿缓存，导致"我明明改了样式却看不到变化"
   （对不写代码的人来说这是最容易误判成"没生效"的一类问题）。
   用文件内容哈希：内容没变就继续吃缓存，内容一变立刻失效。
   2026-10-13 起同时给自托管的 XP.css 加版本号 —— 升级 vendor 里的库时
   URL 同样不会变，不加的话升级了也看不到效果。 */
const cssVersionCache = new Map();   // { [绝对路径]: { stamp, ver } }

function fileVersion(relPath) {
  const file = path.join(hexo.base_dir, 'source', relPath);
  let cached = cssVersionCache.get(file);
  try {
    const stat = fs.statSync(file);
    if (!cached || stat.mtimeMs !== cached.stamp) {
      cached = {
        stamp: stat.mtimeMs,
        ver: crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8),
      };
      cssVersionCache.set(file, cached);
    }
    return cached.ver;
  } catch (err) {
    /* 文件暂时读不到就不加版本号，不影响页面 */
    return null;
  }
}

/* ============================================================
   1. 正文图片：原生懒加载 + 固有尺寸
   ------------------------------------------------------------
   · loading/decoding：随手加，浏览器原生的懒加载，比主题自带的 JS 版可靠。
   · width/height：图片没写尺寸时，浏览器在图片下载完成前不知道它多高，
     会把下面的内容先顶在上面、下载完再"跳"一下（这叫布局位移 / CLS）。
     这里在构建期读一遍图片文件的真实尺寸补上，占位高度就是准的。
     注意 xp-custom.css 里已经有 `max-width:100%; height:auto`，
     所以这两个属性只用来算占位比例，不会把图片拉变形。

   尺寸直接从文件头读（不解码整张图，几十字节就够），支持 PNG / JPEG / GIF；
   认不出来的格式（例如 WebP）或文件不在磁盘上，就静默跳过、不写属性。
   ============================================================ */
const imgSizeCache = new Map();

function readImageSize(buf) {
  if (!buf || buf.length < 24) return null;

  // PNG：8 字节签名，宽高在 IHDR（固定在第 16 / 20 字节，大端）
  if (buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF：'GIF87a' / 'GIF89a'，宽高是小端
  const gif = buf.toString('latin1', 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // JPEG：段式结构，一路跳到带尺寸的 SOF 段（段长不含 0xFF+标记这两字节）
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker === 0xff) { i += 1; continue; }
      // 这几个标记没有长度字段
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      // SOF0..SOF15 里存着高度/宽度；DHT(C4)、JPG(C8)、DAC(CC) 不是 SOF，要排除
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      if (marker === 0xda) break; // 到了压缩数据，后面不会再有 SOF
      i += 2 + len;
    }
  }

  return null;
}

/* src 只处理站内绝对路径（/images/...）；外链、data: 一律跳过 */
function localImageSize(src) {
  if (!src || src.charAt(0) !== '/') return null;
  const clean = src.split('?')[0].split('#')[0];
  if (imgSizeCache.has(clean)) return imgSizeCache.get(clean);
  let size = null;
  try {
    const file = path.join(hexo.base_dir, hexo.config.source_dir || 'source', decodeURIComponent(clean));
    size = readImageSize(fs.readFileSync(file));
  } catch (err) {
    size = null; // 文件不存在 / 读不到，就当作"没有尺寸信息"
  }
  imgSizeCache.set(clean, size);
  return size;
}

/* 摘掉渲染结果里的 HTML 注释。
   站主的规矩：**给人看的注意事项不要出现在网站上**。源码里那些「改哪里、填什么」的注释
   （首页 / 作品页 / 游戏页 / 攻略页里到处是），以及新建文章时自带的字段提示，
   编辑时都很有用，但会原样出现在网页源码里。注释本来就不显示在页面上，
   所以摘掉不影响任何观感；**源码文件一个字没动**，以后改站照样有提示可看。

   ⚠ 顺序：Hexo 核心的 excerpt 过滤器（处理 `<!-- more -->`）注册得比这里早，
     所以轮到我们时它已经换成 <span id="more"> 了，不会误伤。 */
const stripComments = (html) => String(html).replace(/<!--[\s\S]*?-->/g, '');
hexo.extend.filter.register('after_post_render', (data) => {
  if (data.content) data.content = stripComments(data.content);
});
/* 首页 / 作品 / 游戏 / 攻略这些页面不是 post，上面那步管不到，再在最终 HTML 上收一次尾 */
hexo.extend.filter.register('after_render:html', (str) => stripComments(str));

hexo.extend.filter.register('after_post_render', (data) => {
  if (!data.content || data.content.indexOf('<img') === -1) return;
  data.content = data.content.replace(/<img\b([^>]*?)\/?>/g, (match, attrs) => {
    let extra = '';
    if (!/\bloading\s*=/.test(attrs)) extra += ' loading="lazy" decoding="async"';
    // 作者自己写了 width/height 就尊重作者，不覆盖
    if (!/\b(width|height)\s*=/i.test(attrs)) {
      const m = attrs.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const size = m ? localImageSize(m[1] || m[2]) : null;
      if (size) extra += ` width="${size.width}" height="${size.height}"`;
    }
    if (!extra) return match;
    const selfClose = /\/$/.test(match) ? ' /' : '';
    return `<img${attrs}${extra}${selfClose}>`;
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
    /* data-full 曾经预留给「点开放大图」的原图地址，但全站没有任何地方生成过
       这个属性（grep 过 source/ themes/ scripts/，零个产出点），留着会让人以为
       有原图可放大。放大靠 .xp-lightbox 的 max-width/max-height 把同图撑大。 */
    big.src = img.currentSrc || img.src;
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
/* 把一段无数据依赖的浏览器脚本做成**外链文件**（/js/xp-*.js）而不是内联 <script>：
   内联的大段 JS 会把每页 HTML 撑大 50KB+（47 页全站内联 JS 占 2.36M 字节，
   详见审计报告 A 类第 1 条）。用 generator 虚拟路由输出文件，
   HTML 里只留一行 <script src>，浏览器缓存后各页共享。
   实现委托给 scripts/_xp-route-js.js（hexo 传入，避免互相 require 拿不到 hexo 的坑）。 */
const { routeJs, withJsVer, jsVersionCache } = require('./_xp-route-js');

hexo.extend.injector.register('body_end', '<script src="/js/xp-post.js" defer></script>', 'post');
routeJs(hexo, '/js/xp-post.js', () => POST_SCRIPTS);

/* ---------------------------------------------------------- 2a. SVG 图标集合 */
/* 2026-10-18：各页面原先在 HTML 里内联 <circle>/<path> 画标题小图标（首页 9 个、
   works/ 5 个、games/ tools/ 各 1 个），同一个造型散在 6 个文件里，改配色要全找一遍。
   现在统一收成一份 <symbol> 集合注入**每一页**的 body_end，页面只写
   <use href="#icon-xxx"/>；配色规则在 source/css/xp-custom.css 第 0-b 节。
   ⚠ <use href="#id"> 只能引用**同一文档**里的 <symbol>，所以不能只注入首页。
   ⚠ 这里的路径一律不带 stroke/fill 硬编码：颜色由 CSS 给（currentColor 或实色），
     深色模式不用再写第二套。 */
/* ⚠ 下面只是 icon-* 的裸集合（不含外层 <svg> 壳）：壳由 2b 段按页拼。 */
/* 图标改由 scripts/xp-icons.js 统一供给（2026-10-22 像素风重设计）：
   ASCII 8×8 点阵 → <rect>，窗口标题图标、导航图标（xp-taskbar.js）、
   分类/标签页标题图标共用同一份画的真源，改一处三处同步。
   icon-user（兔子站标）2026-10-31 起也走同一份 GLYPHS（平滑线条兔）。 */
const { pixelSymbol, GLYPHS: PIX_GLYPHS } = require('./xp-icons');

/* icon-user 兔子站标（2026-10-31 v5）：原 48×48 像素兔退役（备份见 git 历史），
   改用 IconPark rabbit-zodiac 平滑线条兔（tools/icons/emit-smooth.js 特例，TINT 橙、
   描边统一 G 灰蓝），与全站图标同管线同壳。 */
const ICON_USER_SYMBOL = pixelSymbol("icon-user");
/* 像素图标（scripts/xp-icons.js 的点阵库）转成 <symbol>，与兔子同一张 sprite：
   键名即 <use href="#icon-xxx"> 的 id；pixIcon() 缺图案时抛错，宁可构建期炸
   也别上线后渲染出空白图标。 */
const pixIcon = (name) => {
  const art = PIX_GLYPHS[name];
  if (!art) throw new Error(`xp-enhance: xp-icons.js 里没有图案 "${name}"`);
  return pixelSymbol(name, art);
};
/* 以前这里手写 11 个键名，nav-* / tray-* / 媒体 / 社交那批图案都没进注册表，
   正文里写 <use href="#nav-thanks"> 的页面会渲染成空白（2026-10-30 在首页
   source/index.md 上确认）。现在改成把 xp-icons.js 的 GLYPHS 全量登记：
   键名即图案名，新增图案不用再动这个文件，也不会漏。 */
const ICON_SPRITE_REST = Object.keys(PIX_GLYPHS).map(pixIcon).join('\n');

/* 上一段把所有图标都注进每一页，实测单页 6.6 KB、全站 258 KB —— 绝大多数页面
   一个图标都不用，白背。这里改成「扫描这一页渲染好的 HTML，只保留用到的那几个
   <symbol>」。必须在 after_render 里做（那时内容才定稿）；body_end 注入器只能给
   静态串，拿不到内容。
   规则：结果缓存在 usedIconNames 上，同一个图标集只拼一次字符串。 */
const ICON_SYMBOLS = {};
ICON_SYMBOLS['icon-user'] = ICON_USER_SYMBOL;
/* ⚠ 这里不能用 /icon-[a-z-]+/ 那种前缀正则：nav-home、nav-thanks、tray-start
   这些图案名不以 icon- 开头，会被漏掉，正文里写 <use href="#nav-thanks"> 的页面
   就渲染成空白（2026-10-30 首页 source/index.md 上确认过）。改成匹配任意 id。 */
for (const m of ICON_SPRITE_REST.matchAll(/<symbol id="([a-z][a-z0-9-]*)"[\s\S]*?<\/symbol>/g)) {
  ICON_SYMBOLS[m[1]] = m[0];
}
const iconStripCache = new Map();

/* 有些图标是浏览器里现造的，服务端扫 HTML 扫不到：
   - icon-copy：主题 main.js 给每段代码块 clone 的复制按钮；
   - icon-warn / icon-critical：xp-taskbar.js 运行时报错弹窗。
   这几个无论如何都塞进 sprite，否则运行时 <use> 指向空。 */
const ICON_ALWAYS = ['icon-copy', 'icon-warn', 'icon-critical'];

hexo.extend.filter.register('after_render:html', (str) => {
  const used = new Set((str.match(/<use href="#([a-z][a-z0-9-]*)"/g) || [])
    .map((s) => s.replace(/<use href="#/, '').replace(/"$/, '')));
  for (const n of ICON_ALWAYS) used.add(n);
  const key = [...used].sort().join(',');
  if (!iconStripCache.has(key)) {
    const body = key ? key.split(',').map((n) => ICON_SYMBOLS[n] || '').join('\n') : '';
    iconStripCache.set(key, `<svg id="xp-icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`);
  }
  return str.replace(/<\/body>/i, (tag) => `${iconStripCache.get(key)}${tag}`);
}, 20);
/* ⚠ 优先级必须写 20（默认 10）：xp-taskbar.js 也在 after_render:html 里注入开始菜单，
   开始菜单头像里有 <use href="#icon-user">。过滤器同优先级按**注册顺序**执行，
   而脚本按文件名排序加载（enhance < taskbar），本过滤器会先跑——那时 taskbar
   还没注入，扫描不到头像的 use，sprite 就被裁成空的（2026-10-18 全站 39 页
   「引用了不存在的图标 #icon-user」就是这个原因，首页正文自带 use 才幸免）。
   数字越大越晚执行，20 保证排在 taskbar（默认 10）之后。 */

/* ---------------------------------------------------------- 2b. 本地点赞 */
/* 计数存在访客自己的浏览器（localStorage），键是 xp_like:<文章路径>。
   ⚠ 想改成"所有人看到同一个数字"，将来只需替换 XPLikeBackend 的 get/incr 两个方法
     （例如接到 Twikoo / Waline 的接口），页面上已有的 .xp-like 结构和样式都不用动。
     详见 README 第 12 节。 */
const LIKE_DRIVER = `
(function () {
  if (window.__XP_LIKE_INITED__) return;
  window.__XP_LIKE_INITED__ = true;

  /* 存储层：以后换第三方托管，改这几个方法即可（这是刻意留的后路） */
  var XPLikeBackend = {
    local: function () {
      var self = this;
      this.get = function (key, cb) {
        var n = 0;
        try { n = parseInt(localStorage.getItem('xp_like:' + key), 10) || 0; } catch (e) {}
        cb(Math.max(0, n));          /* 夹到 0 以上：历史数据里若混进负数，显示不要露馅 */
      };
      /* delta = +1 点赞 / -1 取消赞。取消时下限卡在 0 ——
         本地点赞没法在服务端校验，这里只能保证「显示上不会变成负数」。
         （真正的防刷要靠第三方后端，见文件上方注释与 README 第 12 节。） */
      this.bump = function (key, delta, cb) {
        var n = 0;
        try {
          n = (parseInt(localStorage.getItem('xp_like:' + key), 10) || 0) + delta;
          if (n < 0) n = 0;
          localStorage.setItem('xp_like:' + key, String(n));
        } catch (e) {}
        cb(n);
      };
      /* 是否已赞过：决定按钮是"爱心填实"还是"空心" */
      this.mine = function (key, cb) {
        var v = false;
        try { v = localStorage.getItem('xp_like_mine:' + key) === '1'; } catch (e) {}
        cb(v);
      };
      this.setMine = function (key, liked) {
        try {
          if (liked) localStorage.setItem('xp_like_mine:' + key, '1');
          else localStorage.removeItem('xp_like_mine:' + key);
        } catch (e) {}
      };
    },
  };
  /* 曾在这里放 get/bump/mine/setMine 四个空 stub 当「换后端的兜底」，
     但 local() 紧接着就把四个同名方法全覆盖了，stub 永远执行不到，
     反而误导改后端的人去改错地方 —— 2026-10-19 清理时删除。
     换第三方托管（Twikoo/Waline 等）时直接覆盖 local() 这一支即可。 */
  XPLikeBackend.local();
  window.XPLikeBackend = XPLikeBackend;   /* 留个口子，方便以后替换 */

  /* 把一个按钮刷成「已赞 / 未赞」两副样子，点赞和取消都走这里，样式不会走岔 */
  function paint(btn, liked, count) {
    var countEl = btn.querySelector('[data-like-count]');
    if (countEl && typeof count === 'number') countEl.textContent = String(count);
    btn.classList.toggle('is-liked', liked);
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    /* 提示文字跟着变：未赞时说"点赞"，已赞时说"取消赞" */
    btn.title = liked ? '取消点赞' : '点赞（存在你自己的浏览器里）';
    var label = btn.querySelector('.xp-like-label');
    if (label) label.textContent = liked ? '取消赞' : '点赞';
  }

  function bind(btn) {
    var key = btn.getAttribute('data-like-key');
    if (!key) return;

    XPLikeBackend.get(key, function (n) {
      XPLikeBackend.mine(key, function (liked) {
        paint(btn, liked, n);
      });
    });

    btn.addEventListener('click', function (e) {
      /* 卡片上的点赞按钮住在 <a> 里：不拦住就会跳到文章页 */
      e.preventDefault();
      e.stopPropagation();

      var liked = btn.classList.contains('is-liked');
      /* 再点一下 = 撤销：赞变取消、取消变赞（同一个按钮来回切） */
      XPLikeBackend.bump(key, liked ? -1 : 1, function (n) {
        paint(btn, !liked, n);
        XPLikeBackend.setMine(key, !liked);
        btn.classList.remove('bump');
        void btn.offsetWidth;
        btn.classList.add('bump');   /* 点一下弹一下，给点反馈 */
      });
    });
  }

  function scan(root) {
    var list = (root || document).querySelectorAll('.xp-like:not([data-like-bound])');
    for (var i = 0; i < list.length; i++) {
      list[i].setAttribute('data-like-bound', '1');
      bind(list[i]);
    }
  }
  scan(document);
  /* 文章页内容是构建期直出的，这里只是保险：万一以后有异步插入的卡片 */
  document.addEventListener('DOMContentLoaded', function () { scan(document); });
})();
`;
hexo.extend.injector.register('body_end', '<script src="/js/xp-like.js" defer></script>', 'default');
routeJs(hexo, '/js/xp-like.js', () => LIKE_DRIVER);

/* ---------------------------------------------------------- 2c. 加密提示文字 */
/* hexo-blog-encrypt 用 <label>（绝对定位 + 透明度动画）当**框内**占位文字，
   但它自带 padding: 8px 0，和本站把输入框固定成 30px 的规则冲突 ——
   实测文字被挤出框外、还半透明。

   2026-10-14 站主要求：把提示放到**填写框外面**（框上方一行常驻文字）。
   这样比框内占位更好：① 一进页面就能看到提示，不用等它浮动；
   ② 开始输入后提示不会消失（框内 placeholder 一打字就没了）；
   ③ 长一点的提示也放得下。
   做法：把 label 的文案搬到一个新建的 <p class="hbe-hint">，插在输入框**前面**；
   原来的 label 由 CSS 隐藏（它那套浮动动画不再需要）。 */
/* 外链化（同 POST_SCRIPTS / LIKE_DRIVER）：这个提示脚本只有加密文章页用得上。
   按需注入：after_render:html 里检测到 hexo-blog-encrypt 的标记（hbe- 前缀的
   class / id）才追加 <script>，其余页面少一行请求。（旧版无条件注入全站每页。） */
hexo.extend.filter.register('after_render:html', (str) => {
  if (str.indexOf('hbe-') === -1) return str;
  return str.replace(/<\/body>/i, (tag) => `<script src="/js/xp-hbe-hint.js" defer></script>${tag}`);
}, 10);
routeJs(hexo, '/js/xp-hbe-hint.js', () => `
(function () {
  /* ⚠ 插件是**解密时才动态插入**密码框的，所以不能只在 DOMContentLoaded 跑一次 ——
     那一刻页面上还没有 .hbe-input-field，白跑。用 MutationObserver 等它出现。 */
  function fix() {
    var input = document.querySelector('.hbe-input-field');
    var label = document.querySelector('.hbe-input-label');
    if (!input || !label) return false;
    if (document.querySelector('.hbe-hint')) return true;   /* 已经搬过，别重复插 */

    var text = (label.textContent || '').trim();
    if (text) {
      var hint = document.createElement('p');
      hint.className = 'hbe-hint';
      hint.textContent = text;
      /* 插在输入框所在的那个 .hbe-input 外面（即 form 里、输入框行之前），
         这样它显示在**框的上方**而不是框里。 */
      var wrap = input.closest('.hbe-input') || input;
      wrap.parentNode.insertBefore(hint, wrap);
      /* 无障碍：把提示跟输入框关联起来，读屏软件会念出来 */
      hint.id = 'hbeHint';
      input.setAttribute('aria-describedby', 'hbeHint');
    }
    return true;
  }
  if (fix()) return;
  var ob = new MutationObserver(function () { if (fix()) ob.disconnect(); });
  ob.observe(document.documentElement, { childList: true, subtree: true });
  /* 兜底：万一 MutationObserver 没抓到（或浏览器不支持），再试几次就收手 */
  var tries = 0;
  var timer = setInterval(function () {
    if (fix() || ++tries > 20) { clearInterval(timer); ob.disconnect(); }
  }, 300);
})();
`);

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

  /* 样式表加内容版本号，避免浏览器缓存导致"改了样式看不到变化"。
     XP.css 是同一条 URL 的自托管副本，升级库时同理，所以一起加。
     外链 JS（routeJs 产出的 /js/xp-*.js）同理加版本号。 */
  [
    ['/vendor/xp-css/XP.css', 'vendor/xp-css/XP.css'],
    ['/css/xp-custom.css', 'css/xp-custom.css'],
  ].forEach(([url, rel]) => {
    const ver = fileVersion(rel);
    if (ver) str = str.replace(`${url}"`, `${url}?v=${ver}"`);
  });
  for (const routePath of jsVersionCache.keys()) {
    str = withJsVer(str, routePath);
  }

  return str;
});
