---
title: 作品
layout: xp-page
---

<!-- 注意：本页正文是整块原始 HTML，所有 xp_ 标签必须顶格书写。
     一旦某行缩进 4 个空格以上、且前面留了空行，markdown 会把它当成代码块，
     整段 HTML 会被转义成文本、xp_ 标签也不会生效。
     另外正文里不要出现字面的模板定界符（Nunjucks 会尝试解析它）。 -->

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
<symbol id="icon-frame" viewBox="0 0 16 16">
<rect x="1" y="1" width="14" height="14" fill="#8b4513" stroke="#5c2e0a" stroke-width="0.5"/>
<rect x="3" y="3" width="10" height="10" fill="#fff" stroke="#5c2e0a" stroke-width="0.5"/>
<line x1="3" y1="3" x2="13" y2="13" stroke="#ccc" stroke-width="0.5"/>
<line x1="13" y1="3" x2="3" y2="13" stroke="#ccc" stroke-width="0.5"/>
</symbol>
<symbol id="icon-girl" viewBox="0 0 16 16">
<circle cx="8" cy="6" r="3.5" fill="#ffcc99" stroke="#996633" stroke-width="0.5"/>
<path d="M5 4c0-1 1.5-2 3-2s3 1 3 2" fill="#8b4513" stroke="#5c2e0a" stroke-width="0.5"/>
<path d="M4 5c0 2 1 3 2 3" fill="none" stroke="#8b4513" stroke-width="1"/>
<path d="M12 5c0 2-1 3-2 3" fill="none" stroke="#8b4513" stroke-width="1"/>
<circle cx="6.5" cy="6" r="0.5" fill="#333"/>
<circle cx="9.5" cy="6" r="0.5" fill="#333"/>
<path d="M7 8c.5.5 1.5.5 2 0" fill="none" stroke="#cc6666" stroke-width="0.5"/>
<path d="M3 14c0-3 2-5 5-5s5 2 5 5" fill="#ff99cc" stroke="#cc6699" stroke-width="0.5"/>
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
<symbol id="icon-filter" viewBox="0 0 16 16">
<rect x="1" y="1" width="14" height="14" fill="#f0f0e8" stroke="#666" stroke-width="0.5"/>
<path d="M4 4h8M4 8h8M4 12h5" stroke="#666" stroke-width="1.2" stroke-linecap="round"/>
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
<p>按时间倒序排列，点击窗口卡片查看详情～</p>
<div class="header-stats">
<span class="header-chip"><strong>{% xp_num works %}</strong> 件作品</span>
<span class="header-chip"><strong>{% xp_num workcats %}</strong> 个分类</span>
<span class="header-chip"><strong>{% xp_num tags %}</strong> 个标签</span>
</div>
</div>
</div>
</div>

<!-- 分类筛选栏（按钮由文章分类生成） -->
<div class="works-item works-filter">
<div class="xp-window">
<div class="xp-window-title compact">
<span class="xp-window-title-text">
<svg class="inline-icon" width="12" height="12" aria-hidden="true"><use href="#icon-filter"/></svg>
分类筛选
</span>
</div>
<div class="xp-window-body compact-body">
{% xp_work_filters %}
</div>
</div>
</div>

<!-- 作品卡片（精选 + 普通，全部由文章生成） -->
{% xp_work_cards %}

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

<!-- 即将上线 -->
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
新增作品只要写一篇文章、填好 categories / thumbnail / short_title / desc，本页卡片与首页「最近作品」会自动更新。
</div>
</div>

</div>
</div>

<script>
(function () {
  var btns = document.querySelectorAll('.filter-btn');
  var items = document.querySelectorAll('.works-item[data-category]');
  var status = document.querySelector('.filter-status');
  if (!btns.length) return;

  function apply(filter) {
    var shown = 0;
    Array.prototype.forEach.call(items, function (item) {
      var match = filter === 'all' || item.getAttribute('data-category') === filter;
      item.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    if (status) {
      status.textContent = filter === 'all'
        ? '显示全部 ' + shown + ' 件作品'
        : '筛选「' + filter + '」：' + shown + ' 件作品';
    }
  }

  Array.prototype.forEach.call(btns, function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(btns, function (b) {
        var active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      apply(btn.getAttribute('data-filter'));
    });
  });
})();
</script>

<!-- ========== 页面级排布（组件样式统一在 /css/xp-custom.css） ========== -->
<style>
.works-header,
.works-filter,
.works-tip { grid-column: 1 / -1; grid-row: span 1; }
.works-featured { grid-column: 1 / 8; grid-row: span 3; }
.works-normal { grid-column: 8 / 11; grid-row: span 2; }
.works-normal + .works-normal { grid-column: 11 / 13; grid-row: span 2; }
.works-tags { grid-column: 8 / 11; grid-row: span 1; }
.works-mini-stats { grid-column: 11 / 13; grid-row: span 1; }
.works-upcoming { grid-column: 8 / 13; grid-row: span 1; }

@media (max-width: 900px) {
  .works-featured { grid-column: 1 / 5; grid-row: span 3; }
  .works-normal,
  .works-normal + .works-normal { grid-column: 5 / 7; grid-row: span 2; }
  .works-tags,
  .works-mini-stats { grid-column: 5 / 7; grid-row: span 1; }
  .works-upcoming { grid-column: 1 / -1; grid-row: span 1; }
}
</style>
