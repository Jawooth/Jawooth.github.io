
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
