
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
