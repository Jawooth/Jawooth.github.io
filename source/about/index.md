---
title: 关于
layout: xp-page
---

<!-- SVG 图标集合 -->
<svg width="0" height="0" style="position:absolute;visibility:hidden" aria-hidden="true">
<defs>
<symbol id="icon-person" viewBox="0 0 16 16">
<circle cx="8" cy="5" r="3.5" fill="#fc9" stroke="#963" stroke-width="0.5"/>
<path d="M3 14c0-4 2.5-6 5-6s5 2 5 6" fill="#69c" stroke="#369" stroke-width="0.5"/>
</symbol>
<symbol id="icon-works" viewBox="0 0 16 16">
<path d="M8 1C4 1 1 4 1 8s3 7 7 7c1 0 2-1 2-2s-1-1-1-2 1-2 2-2 2 1 2 2 1 2 2 2 2-1 2-2c0-3-3-7-7-7z" fill="#e88" stroke="#c66" stroke-width="0.5"/>
<circle cx="5" cy="6" r="1.2" fill="#fff"/>
<circle cx="11" cy="6" r="1.2" fill="#fff"/>
<circle cx="5" cy="10" r="1.2" fill="#fff"/>
<circle cx="10" cy="11" r="1.2" fill="#fff"/>
</symbol>
<symbol id="icon-games" viewBox="0 0 16 16">
<rect x="2" y="4" width="12" height="8" rx="3" fill="#4a4a4a" stroke="#222" stroke-width="0.5"/>
<circle cx="5" cy="8" r="1.5" fill="#d0d0d0"/>
<circle cx="11" cy="7" r="1" fill="#ff6b6b"/>
<circle cx="12" cy="9" r="1" fill="#6b8cff"/>
<rect x="4" y="7" width="2" height="0.8" fill="#d0d0d0"/>
<rect x="4.6" y="6.2" width="0.8" height="2.5" fill="#d0d0d0"/>
</symbol>
<symbol id="icon-guides" viewBox="0 0 16 16">
<path d="M2 2h5v12H2z" fill="#c44" stroke="#900" stroke-width="0.5"/>
<path d="M14 2H9v12h5V2z" fill="#47c" stroke="#039" stroke-width="0.5"/>
<line x1="7" y1="2" x2="9" y2="2" stroke="#666" stroke-width="0.5"/>
<line x1="7" y1="14" x2="9" y2="14" stroke="#666" stroke-width="0.5"/>
</symbol>
<symbol id="icon-todo" viewBox="0 0 16 16">
<rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#003399" stroke-width="0.5"/>
<rect x="2" y="1" width="12" height="3" rx="1" fill="#0066cc" stroke="#003399" stroke-width="0.5"/>
<rect x="4" y="5.5" width="2" height="2" fill="#66cc66" stroke="#003399" stroke-width="0.8"/>
<path d="M4.5 6.5l1 1 2-2" fill="none" stroke="#fff" stroke-width="0.8"/>
</symbol>
<symbol id="icon-blog" viewBox="0 0 16 16">
<rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#666" stroke-width="0.5"/>
<line x1="4" y1="5" x2="12" y2="5" stroke="#666" stroke-width="0.8"/>
<line x1="4" y1="8" x2="12" y2="8" stroke="#666" stroke-width="0.8"/>
<line x1="4" y1="11" x2="9" y2="11" stroke="#666" stroke-width="0.8"/>
</symbol>
<symbol id="icon-mail" viewBox="0 0 16 16">
<rect x="1" y="3" width="14" height="10" fill="#fff" stroke="#666" stroke-width="0.5"/>
<path d="M1 3l7 6 7-6" fill="none" stroke="#666" stroke-width="0.8"/>
</symbol>
<symbol id="icon-bulb" viewBox="0 0 16 16">
<circle cx="8" cy="6" r="4" fill="#ffff66" stroke="#cc9900" stroke-width="0.5"/>
<rect x="6" y="10" width="4" height="2" fill="#999" stroke="#666" stroke-width="0.5"/>
<rect x="5.5" y="12" width="5" height="1" fill="#666" stroke="#333" stroke-width="0.5"/>
<rect x="6" y="13" width="4" height="1" fill="#666" stroke="#333" stroke-width="0.5"/>
<line x1="8" y1="2" x2="8" y2="3" stroke="#ff9900" stroke-width="0.8"/>
<line x1="4" y1="4" x2="5" y2="5" stroke="#ff9900" stroke-width="0.8"/>
<line x1="11" y1="5" x2="12" y2="4" stroke="#ff9900" stroke-width="0.8"/>
</symbol>
<symbol id="icon-heart" viewBox="0 0 16 16">
<path d="M8 14s-6-4-6-8c0-2 1.5-3.5 3.5-3.5 1.5 0 2.5 1 2.5 2s1-2 2.5-2c2 0 3.5 1.5 3.5 3.5 0 4-6 8-6 8z" fill="#ff6b8a" stroke="#cc4466" stroke-width="0.5"/>
</symbol>
</defs>
</svg>

<div class="about-page xp-page-fullwidth">
<div class="xp-bento">

<!-- 个人介绍 -->
<div class="about-item about-profile">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text"><svg class="inline-icon" width="16" height="16" aria-hidden="true"><use href="#icon-person"/></svg> 关于我</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body">
<div class="about-profile-layout">
<!-- 头像 / 标题 / 段落 / 标签 都在 source/_data/profile.yml 里改 -->
<img class="about-avatar" src="{% xp_profile avatar %}" alt="{% xp_profile name %} 的头像" width="256" height="256">
<div class="about-text">
<h2>{% xp_profile about.title %}</h2>
{% xp_profile_lines about.paragraphs %}
<div class="about-meta">
{% xp_profile_chips about.chips %}
</div>
</div>
</div>
</div>
</div>
</div>

<!-- 站点导航 -->
<div class="about-item about-nav">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text"><svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-blog"/></svg> 本站内容</span>
</div>
<div class="xp-window-body compact-body">
<ul class="about-nav-list">
<li><a href="/works/"><svg width="14" height="14" aria-hidden="true"><use href="#icon-works"/></svg> 作品</a><span>画作和文章</span></li>
<li><a href="/games/"><svg width="14" height="14" aria-hidden="true"><use href="#icon-games"/></svg> 游戏/工具</a><span>开发中的小玩意</span></li>
<li><a href="/guides/"><svg width="14" height="14" aria-hidden="true"><use href="#icon-guides"/></svg> 攻略教程</a><span>计划中的攻略与教程</span></li>
<li><a href="/todo/"><svg width="14" height="14" aria-hidden="true"><use href="#icon-todo"/></svg> 待办</a><span>我的待办事项</span></li>
<li><a href="/blog/"><svg width="14" height="14" aria-hidden="true"><use href="#icon-blog"/></svg> 杂谈</a><span>个人碎碎念</span></li>
</ul>
</div>
</div>
</div>

<!-- 联系方式 -->
<div class="about-item about-contact">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text"><svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-mail"/></svg> 联系方式</span>
</div>
<div class="xp-window-body compact-body">
<p class="contact-desc">{% xp_profile about.contact_desc %}</p>
<div class="contact-links">
<!-- GitHub / 邮箱 从 profile.yml 的 contacts 读取；留空则不显示 -->
{% xp_profile_contacts %}
<a class="xp-btn" href="/blog/">杂谈</a>
<a class="xp-btn" href="/">首页</a>
</div>
</div>
</div>
</div>

<!-- 致谢与参考 -->
<div class="about-item about-credits">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text"><svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-heart"/></svg> 致谢 &amp; 参考</span>
</div>
<div class="xp-window-body compact-body">
<p class="credits-intro">本站的诞生离不开以下开源项目与工具的支持 💖</p>
<div class="credits-grid">
<div class="credit-item">
<div class="credit-name">Hexo</div>
<div class="credit-desc">静态站点生成器</div>
<a class="credit-link" href="https://hexo.io/" target="_blank" rel="noopener">hexo.io →</a>
</div>
<div class="credit-item">
<div class="credit-name">XP.css</div>
<div class="credit-desc">Windows XP 风格灵感来源</div>
<a class="credit-link" href="https://botoxparty.github.io/XP.css/" target="_blank" rel="noopener">botoxparty.github.io/XP.css →</a>
</div>
<div class="credit-item">
<div class="credit-name">hexo-theme-minimalism</div>
<div class="credit-desc">极简 Hexo 主题（基础框架）</div>
<a class="credit-link" href="https://www.npmjs.com/package/hexo-theme-minimalism" target="_blank" rel="noopener">npmjs.com →</a>
</div>
<div class="credit-item">
<div class="credit-name">APlayer</div>
<div class="credit-desc">HTML5 音乐播放器（可选启用）</div>
<a class="credit-link" href="https://aplayer.js.org/" target="_blank" rel="noopener">aplayer.js.org →</a>
</div>
<div class="credit-item">
<div class="credit-name">Google Fonts · Caveat</div>
<div class="credit-desc">手写风格字体</div>
<a class="credit-link" href="https://fonts.google.com/specimen/Caveat" target="_blank" rel="noopener">fonts.google.com →</a>
</div>
<div class="credit-item credit-special">
<div class="credit-name">TRAE AI 助手</div>
<div class="credit-desc">协助搭建与设计本站</div>
<span class="credit-link credit-ai">✨ Made with AI</span>
</div>
</div>
</div>
</div>
</div>

<!-- 提示框 -->
<div class="about-item about-tip">
<div class="xp-tip-box">
<strong><svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-bulb"/></svg> 小提示：</strong>
本站所有页面共用一套 XP 设计系统，组件样式集中在 source/css/xp-custom.css，页面里只写网格排布。
</div>
</div>

</div>
</div>

<!-- ========== 页面级排布（组件样式统一在 /css/xp-custom.css） ========== -->
<style>
.about-profile { grid-column: 1 / 9; grid-row: span 3; }
.about-nav { grid-column: 9 / 13; grid-row: span 2; }
.about-contact { grid-column: 9 / 13; grid-row: span 1; }
.about-credits { grid-column: 1 / 9; grid-row: span 2; }
.about-tip { grid-column: 1 / -1; grid-row: span 1; }

@media (max-width: 900px) {
  .about-profile { grid-column: 1 / 7; grid-row: span 2; }
  .about-nav { grid-column: 1 / 4; grid-row: span 2; }
  .about-contact { grid-column: 4 / 7; grid-row: span 2; }
  .about-credits { grid-column: 1 / 7; grid-row: span 2; }
}
</style>
