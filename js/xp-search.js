
/* 站内搜索驱动（构建期由 scripts/xp-content.js 生成，勿手改）。
   索引 /search.json 由 xp-search-index 生成器产出；首次输入时才拉取。 */
(function () {
  'use strict';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('form[data-xp-search]'));
  if (!boxes.length) return;
  var posts = null;
  var loading = false;

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function out(box) { return box.querySelector('.xp-search-results'); }

  function render(box, list, keyword) {
    var o = out(box);
    if (!o) return;
    if (!list.length) {
      o.innerHTML = '<p class="xp-search-hint">没有找到与「' + esc(keyword) + '」相关的文章</p>';
      return;
    }
    var html = '<ul>';
    list.slice(0, 6).forEach(function (p) {
      html += '<li><a href="' + esc(p.url) + '">' + esc(p.title) +
        '<span class="res-meta">' + esc(p.date) + ' · ' + esc(p.meta) + '</span></a></li>';
    });
    o.innerHTML = html + '</ul>';
  }

  /* 有输入的框都重搜一遍：索引加载完成的那一刻，所有正等着结果的框一起出结果。
     （单框时代是回调里只重跑触发的那一个；多框之后偷这个懒会丢结果。） */
  function refreshAll() {
    boxes.forEach(function (b) {
      var i = b.querySelector('.xp-search-input');
      if (i && i.value.trim()) search(b);
    });
  }

  function search(box) {
    var input = box.querySelector('.xp-search-input');
    var o = out(box);
    if (!input || !o) return;
    var raw = input.value.trim();
    var kw = raw.toLowerCase();
    if (!kw) { o.innerHTML = ''; return; }
    if (!posts) {
      if (loading) return;
      loading = true;
      o.innerHTML = '<p class="xp-search-hint">正在加载索引…</p>';
      fetch('/search.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { posts = (data && data.posts) || []; loading = false; refreshAll(); })
        .catch(function () { loading = false; refreshAll('fail'); });
      return;
    }
    var hit = posts.filter(function (p) {
      return (p.title && p.title.toLowerCase().indexOf(kw) >= 0) ||
        (p.text && p.text.toLowerCase().indexOf(kw) >= 0) ||
        (p.meta && p.meta.toLowerCase().indexOf(kw) >= 0);
    });
    render(box, hit, raw);
  }

  boxes.forEach(function (box) {
    var input = box.querySelector('.xp-search-input');
    if (!input) return;
    input.addEventListener('input', function () { search(box); });
    box.addEventListener('submit', function (e) { e.preventDefault(); search(box); });
  });
})();
