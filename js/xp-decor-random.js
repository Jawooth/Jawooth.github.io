
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
})();