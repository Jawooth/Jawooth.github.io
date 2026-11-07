
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
    /* 2026-11-06：原来写的是 '恢复。' + name + '。' —— 窗口标题本身常带标点
       （「参考过设计与思路的项目」），再补句号会变成两句独立的话，读起来像
       两条不同的提示。改成冒号分隔：'恢复：前端库（…）'。 */
    chip.textContent = '恢复：' + name;
    chip.title = name + ' —— 点击恢复窗口';
    chip.setAttribute('aria-label', '恢复窗口 ' + name);
    chip.addEventListener('click', function () {
      win.removeAttribute('data-xp-closed');
      chip.remove();
    });
    restoreBar().appendChild(chip);
  }

  /* 页面外壳也算一个「窗口」（2026-11-02 修复）：
     归档 / 分类 / 标签 / 独立页面这几页的标题栏是 xp-window-title.ejs 画的，
     外面套的是 .content-container，不是 .xp-window。
     以前点最小化/最大化/关闭三个按钮毫无反应（btn.closest('.xp-window') 找不到就 return）。
     现在找不到 .xp-window 时退回外壳，外壳复用同一套状态类，
     配套样式在 source/css/xp-custom.css 的「页面外壳的窗口状态」一节。 */
  function windowOf(btn) {
    var win = btn.closest('.xp-window');
    if (win) return win;
    var title = btn.closest('.xp-window-title');
    if (!title) return null;
    var shell = title.parentElement;
    if (!shell || !shell.classList.contains('content-container')) return null;
    return shell;
  }

  function act(btn) {
    /* data-xp-local = 临时浮层（邮箱弹窗、关机错误窗）的豁免标记，        它们自带关闭逻辑，绝不能进「最小化/恢复 chip」这套常驻窗口流程，
       否则关掉浮层后左下角会冒出一个多余的「恢复」按钮（2026-10-14 实测踩过）。
*/
    if (btn.getAttribute('data-xp-local')) return;
    var win = windowOf(btn);
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
