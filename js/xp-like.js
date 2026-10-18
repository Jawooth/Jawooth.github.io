
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
    get: function (key, cb) { cb(0); },
    bump: function (key, delta, cb) { cb(0); },
    mine: function (key, cb) { cb(false); },
    setMine: function () {}
  };
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
