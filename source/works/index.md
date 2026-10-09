---
title: 作品
layout: xp-page
---

<!-- 注意：本页正文是整块原始 HTML，所有 xp_ 标签必须顶格书写。
     一旦某行缩进 4 个空格以上、且前面留了空行，markdown 会把它当成代码块，
     整段 HTML 会被转义成文本、xp_ 标签也不会生效。
     另外正文里不要出现字面的模板定界符——包括注释里也不行：
     标签在注释里照样会被执行一遍，白白复制一份 HTML（踩过）。 -->

<!-- 作品卡片由下方那个「作品集」标签自动生成（详见 MAINTENANCE.md）：
       · 栏目（原创 / 同人）来自文章的 origin: 原创 或 origin: 同人（没写就是原创）
       · 时间轴分期按文章日期自动归入，也可以用 era: 2025 年 手动指定
       · 标签筛选、屏蔽模式、展开全文都是页面内的交互，不需要额外配置 -->

<!-- SVG 图标集合 -->
<svg width="0" height="0" style="position:absolute;visibility:hidden" aria-hidden="true">
<defs>
<symbol id="icon-palette" viewBox="0 0 16 16">
<path d="M8 1C4 1 1 4 1 8s3 7 7 7c1 0 2-1 2-2s-1-1-1-2 1-2 2-2 2 1 2 2 1 2 2 2 2-1 2-2c0-3-3-7-7-7z" fill="#ff9999" stroke="#cc6666" stroke-width="0.5"/>
<circle cx="5" cy="6" r="1.2" fill="#ff6666"/>
<circle cx="11" cy="6" r="1.2" fill="#66cc66"/>
<circle cx="5" cy="10" r="1.2" fill="#6666ff"/>
<circle cx="10" cy="11" r="1.2" fill="#ffff66"/>
</symbol>
<symbol id="icon-pencil" viewBox="0 0 16 16">
<path d="M10 1l5 5-9 9H1v-5l9-9z" fill="#ffcc66" stroke="#cc9933" stroke-width="0.5"/>
<path d="M10 1l5 5-2 2-5-5 2-2z" fill="#ff9966" stroke="#cc6633" stroke-width="0.5"/>
<path d="M2 13l3 1-1 3" fill="#996633" stroke="#663300" stroke-width="0.5"/>
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
<symbol id="icon-tag" viewBox="0 0 16 16">
<path d="M2 7l7-5 5 5-7 7-5-7z" fill="#ffff99" stroke="#cc9933" stroke-width="0.5"/>
</symbol>
<symbol id="icon-chart" viewBox="0 0 16 16">
<rect x="1" y="1" width="14" height="14" fill="#f0f0e8" stroke="#666" stroke-width="0.5"/>
<path d="M3 12l3-4 3 2 4-6" fill="none" stroke="#60b060" stroke-width="1.5"/>
</symbol>
<symbol id="icon-clock" viewBox="0 0 16 16">
<circle cx="8" cy="8" r="6" fill="none" stroke="#f0a040" stroke-width="1.5"/>
<path d="M8 4v4l3 2" fill="none" stroke="#f0a040" stroke-width="1.5" stroke-linecap="round"/>
</symbol>
</defs>
</svg>

<div class="works-page xp-page-fullwidth">
<div class="xp-bento">

<!-- 标题窗口 -->
<div class="works-item works-header">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text">
<svg class="inline-icon" width="16" height="16" aria-hidden="true"><use href="#icon-palette"/></svg>
我的作品集
</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body header-body">
<p>按时间倒序排列：先选「原创 / 同人」，再按分期展开，也可以点标签只看某一类。</p>
<div class="header-stats">
<span class="header-chip"><strong>{% xp_num works %}</strong> 件作品</span>
<span class="header-chip"><strong>{% xp_num workcats %}</strong> 个分类</span>
<span class="header-chip"><strong>{% xp_num tags %}</strong> 个标签</span>
</div>
</div>
</div>
</div>

<!-- 作品集：分栏目 + 时间轴分期 + 标签筛选 + 就地展开全文 -->
<div class="works-item works-gallery">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text">
<svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-palette"/></svg>
作品集
</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body">
{% xp_work_gallery %}
</div>
</div>
</div>

<!-- 标签云 -->
<div class="works-item works-tags">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" aria-hidden="true"><use href="#icon-tag"/></svg>
标签云
</span>
</div>
<div class="xp-window-body compact-body">
{% xp_tag_cloud cloud %}
</div>
</div>
</div>

<!-- 创作统计 -->
<div class="works-item works-mini-stats">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" aria-hidden="true"><use href="#icon-chart"/></svg>
创作统计
</span>
</div>
<div class="xp-window-body compact-body">
<div class="mini-stats-grid">
<div class="mini-stat"><strong>{% xp_num works %}</strong><span>作品</span></div>
<div class="mini-stat"><strong>{% xp_num months %}</strong><span>月</span></div>
<div class="mini-stat"><strong>{% xp_num tags %}</strong><span>标签</span></div>
<div class="mini-stat"><strong>∞</strong><span>灵感</span></div>
</div>
</div>
</div>
</div>

<!-- 创作中 -->
<div class="works-item works-upcoming">
<div class="xp-window work-window-card upcoming">
<div class="xp-window-title">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" aria-hidden="true"><use href="#icon-clock"/></svg>
创作中
</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body">
<div class="upcoming-content">
<div class="upcoming-icon"><svg width="36" height="36" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-pencil"/></svg></div>
<p>下一幅作品正在酝酿中，敬请期待……</p>
<span class="work-status doing">进行中</span>
</div>
</div>
</div>
</div>

<!-- 提示框 -->
<div class="works-item works-tip">
<div class="xp-tip-box">
<strong><svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-bulb"/></svg> 小提示：</strong>
新增作品只要写一篇文章、填好 categories / origin / thumbnail / short_title / desc，本页卡片与首页「最近作品」会自动更新；想手动指定分期就加一行 era: 2025 年。
</div>
</div>

</div>
</div>

<!-- ========== 页面级排布（组件样式统一在 /css/xp-custom.css） ========== -->
<style>
.works-header,
.works-gallery,
.works-tip { grid-column: 1 / -1; grid-row: span 1; }
.works-tags       { grid-column: 1 / 5;  grid-row: span 1; }
.works-mini-stats { grid-column: 5 / 9;  grid-row: span 1; }
.works-upcoming   { grid-column: 9 / 13; grid-row: span 1; }

@media (max-width: 900px) {
  .works-tags,
  .works-mini-stats,
  .works-upcoming { grid-column: 1 / 7; grid-row: auto; }
}
</style>
