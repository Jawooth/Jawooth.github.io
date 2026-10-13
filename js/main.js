/* global window, document */
'use strict';

// 菜单
document.querySelector('.menu-switch').addEventListener('click', function() {
  const menuContainer = document.querySelector('.menu-container');

  if (this.classList.contains('icon-menu-outline')) {
    this.classList.replace('icon-menu-outline', 'icon-close-outline');
    menuContainer.style.opacity = '1';
    menuContainer.style.height = 'auto';
    menuContainer.style['z-index'] = '1024';
  } else {
    this.classList.replace('icon-close-outline', 'icon-menu-outline');
    menuContainer.style.opacity = '0';
    menuContainer.style['z-index'] = '0';

    setTimeout(() => {
      if (this.classList.contains('icon-menu-outline')) {
        menuContainer.style.height = '0';
      }
    }, 600);
  }
});

// 代码复制
function addCopyIcons() {
  const copyIcon = document.createElement('i');
  copyIcon.className = 'fa-solid icon icon-copy copy-code';
  copyIcon.title = '复制代码';

  /* 选择器是 .post-content —— 模板（post.ejs:39 / page.ejs:19）输出的就是它。
     原先这里写的是 .post-detail，那是主题老版的类名，改名后没跟着改：
     页面里根本没有 .post-detail，于是「复制代码」按钮一直是 0 个、功能静默失效。
     （2026-10 修，配合 post.styl 里 .copy-code 的作用域一起改。） */
  document.querySelectorAll('.post-content figure').forEach(figure => {
    figure.appendChild(copyIcon.cloneNode(true));
  });

  document.querySelectorAll('.post-content pre[class*=language-].line-numbers').forEach(codeBlock => {
    codeBlock.appendChild(copyIcon.cloneNode(true));
  });

  document.querySelectorAll('.post-content .copy-code').forEach(copyCodeBtn => {
    copyCodeBtn.addEventListener('click', function() {
      const selection = window.getSelection();
      const range = document.createRange();
      const table = this.previousElementSibling.tagName === 'TABLE' ? this.previousElementSibling : null;
      const preElement = table ? table.querySelector('.code pre') : this.previousElementSibling;

      range.selectNodeContents(preElement);
      selection.removeAllRanges();
      selection.addRange(range);
      selection.toString();
      document.execCommand('copy');
      selection.removeAllRanges();

      this.innerHTML = '<span class="copy-success"> 复制成功</span>';
      const that = this;
      setTimeout(() => {
        that.innerHTML = '';
      }, 2500);
    });
  });
}

// 代码语言
function setLanguageAttributes() {
  const setLanguageAttribute = (element, attributeName) => {
    const codeLanguage = element.getAttribute('class');
    if (codeLanguage) {
      const langName = codeLanguage.replace(attributeName, '').trim().replace('language-', '').trim();
      element.setAttribute('data-content-after', langName || 'CODE');
    }
  };

  document.querySelectorAll('code').forEach(codeBlock => {
    setLanguageAttribute(codeBlock, 'line-numbers');
  });

  document.querySelectorAll('.highlight').forEach(highlightBlock => {
    setLanguageAttribute(highlightBlock, 'highlight');
  });
}

// 文章详情侧边目录
// 2026-10 删除：这一整段（原 handleScroll / bindScrollEvent / bindClickEvent）
// 查的是 .top-box a 与 .top-box-link，而站内**没有任何模板输出这两个类**
// （post.ejs 用的是 .post-content，目录由 xp-content.js 渲染成 .xp-toc、
//   由 xp-enhance.js 绑定滚动高亮）。
// 也就是说主题这套目录早已被站内自己的实现取代，留着只是每次滚动白跑一遍查询，
// 并且会让人误以为改这里能影响页面目录。要恢复目录请改 xp-enhance.js。

// 图片懒加载
// 2026-10 删除：主题这套 lazyload（原 lazyload / lazyloadLoad）整段是空转的 ——
// 它开头就判断 window.theme_config.image.lazyload_enable，而 _config.minimalism.yml
// 里那一项固定为 false（站内改用构建期注入原生 loading="lazy"，见 xp-enhance.js）。
// 留着只会给人「这里能开懒加载」的错觉。

// 初始化页面
function themeBoot() {
  if (window.is_post) {
    addCopyIcons();
    setLanguageAttributes();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  themeBoot();
});

// hexo-blog-encrypt See https://github.com/D0n9X1n/hexo-blog-encrypt
window.addEventListener('hexo-blog-decrypt', () => {
  themeBoot();
});


// 搜索弹窗交互与搜索逻辑
// 2026-10-12 安全审查后整段删除（原 194-333 行）：
//   1. 本站 search.enable 为 false，这段从未激活，是死代码；
//   2. 它用未转义的 item.title/url 拼 innerHTML（存储型 XSS 面），且
//      target=\"_blank\" 缺 rel=\"noopener noreferrer\"（反向 tabnabbing）；
//   3. 全站搜索已由 source/index.md 自建（xp-content.js，esc() 正确转义）。
// 若将来真要启用主题搜索，不要直接从 git 历史里捞回来 —— 重写时先过 esc()、
// 补 rel，并评估 algolia CDN 引入的第三方信任面。
