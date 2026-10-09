---
title: 攻略教程
layout: xp-page
---

<!-- SVG 图标集合 -->
<svg width="0" height="0" style="position:absolute;visibility:hidden" aria-hidden="true">
<defs>
<symbol id="icon-book" viewBox="0 0 16 16">
<path d="M2 2h5v12H2z" fill="#c44" stroke="#900" stroke-width="0.5"/>
<path d="M14 2H9v12h5V2z" fill="#47c" stroke="#039" stroke-width="0.5"/>
<line x1="7" y1="2" x2="9" y2="2" stroke="#666" stroke-width="0.5"/>
<line x1="7" y1="14" x2="9" y2="14" stroke="#666" stroke-width="0.5"/>
</symbol>
<symbol id="icon-game-guide" viewBox="0 0 16 16">
<path d="M1 8l7-7 7 7-7 7L1 8z" fill="#e66" stroke="#c22" stroke-width="0.5"/>
<circle cx="5" cy="8" r="1.5" fill="#fff"/>
<circle cx="11" cy="8" r="1.5" fill="#fff"/>
</symbol>
<symbol id="icon-art-guide" viewBox="0 0 16 16">
<path d="M1 8l7-7 7 7-7 7L1 8z" fill="#6c6" stroke="#2a2" stroke-width="0.5"/>
<path d="M8 4c-2 0-4 2-4 4s2 4 4 4 4-2 4-4-2-4-4-4z" fill="#fff"/>
</symbol>
<symbol id="icon-tech-guide" viewBox="0 0 16 16">
<path d="M1 8l7-7 7 7-7 7L1 8z" fill="#6ae" stroke="#27c" stroke-width="0.5"/>
<rect x="5" y="5" width="6" height="6" fill="#fff" stroke="#27c" stroke-width="0.5"/>
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
</defs>
</svg>

<div class="guides-page xp-page-fullwidth">
<div class="xp-bento">

<!-- 标题窗口 -->
<div class="guides-item guides-header">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text"><svg class="inline-icon" width="16" height="16" aria-hidden="true"><use href="#icon-book"/></svg> 攻略教程</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body header-body">
<p>下面是计划要写的清单，还没有成文（标「待写」），所以这里暂时不能点。</p>
<div class="header-stats">
<span class="header-chip"><strong>{% xp_num guides_planned %}</strong> 篇待写</span>
<span class="header-chip"><strong>{% xp_num guides_online %}</strong> 篇已上线</span>
</div>
</div>
</div>
</div>

<!-- 分组列表由 source/_data/guides.yml 生成 -->
{% xp_guides %}

<!-- 提示框 -->
<div class="guides-item guides-tip">
<div class="xp-tip-box">
<strong><svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-bulb"/></svg> 小提示：</strong>
写完一篇就把 source/_data/guides.yml 里对应条目的 status 改成 online 并补上 url，条目会立刻变成真链接。
</div>
</div>

</div>
</div>

<!-- ========== 页面级排布（组件样式统一在 /css/xp-custom.css） ========== -->
<style>
.guides-header,
.guides-tip { grid-column: 1 / -1; grid-row: span 1; }
.guides-section-title { grid-column: 1 / 4; grid-row: span 1; }
.guides-list { grid-column: 4 / -1; grid-row: span 1; }

@media (max-width: 900px) {
  .guides-section-title,
  .guides-list { grid-column: 1 / -1; }
}
</style>
