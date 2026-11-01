---
title: 分类
layout: xp-page
---

<div class="xp-index-page">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text">
<svg class="inline-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><g shape-rendering="crispEdges">{% xp_pixel_rects nav-folder %}</g></svg>
全部分类
</span>
<span class="xp-window-btns" role="group" aria-label="窗口操作"><i class="xp-window-btn" data-action="min" role="button" tabindex="0" aria-label="最小化"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="7" width="8" height="2" fill="currentColor"/></svg></i><i class="xp-window-btn" data-action="max" role="button" tabindex="0" aria-label="最大化"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></i><i class="xp-window-btn close" data-action="close" role="button" tabindex="0" aria-label="关闭"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.4" fill="none"/></svg></i></span>
</div>
<div class="xp-window-body">
<p class="contact-desc">共 {% xp_num categories %} 个分类（按文章数排序）。</p>
{% xp_category_index %}
</div>
</div>
</div>
