---
title: 待办事项
layout: xp-page
---

<!-- SVG 图标集合 -->
<svg width="0" height="0" style="position:absolute;visibility:hidden" aria-hidden="true">
<defs>
<symbol id="icon-list" viewBox="0 0 16 16">
<rect x="2" y="1" width="12" height="14" rx="1" fill="#fff" stroke="#003399" stroke-width="0.5"/>
<rect x="2" y="1" width="12" height="3" rx="1" fill="#0066cc" stroke="#003399" stroke-width="0.5"/>
<rect x="4" y="5.5" width="2" height="2" fill="#66cc66" stroke="#003399" stroke-width="0.8"/>
<path d="M4.5 6.5l1 1 2-2" fill="none" stroke="#fff" stroke-width="0.8"/>
</symbol>
<symbol id="icon-working" viewBox="0 0 16 16">
<circle cx="8" cy="8" r="4" fill="#ff9966" stroke="#cc6633" stroke-width="0.5"/>
<rect x="7" y="2" width="2" height="2" fill="#ff9966" stroke="#cc6633" stroke-width="0.5"/>
<rect x="7" y="12" width="2" height="2" fill="#ff9966" stroke="#cc6633" stroke-width="0.5"/>
<rect x="2" y="7" width="2" height="2" fill="#ff9966" stroke="#cc6633" stroke-width="0.5"/>
<rect x="12" y="7" width="2" height="2" fill="#ff9966" stroke="#cc6633" stroke-width="0.5"/>
<circle cx="8" cy="8" r="1.5" fill="#fff"/>
</symbol>
<symbol id="icon-todo" viewBox="0 0 16 16">
<circle cx="8" cy="8" r="6" fill="none" stroke="#666" stroke-width="1"/>
</symbol>
<symbol id="icon-done" viewBox="0 0 16 16">
<circle cx="8" cy="8" r="6" fill="#66cc66" stroke="#339933" stroke-width="0.5"/>
<path d="M5 8l2 2 4-4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
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

<div class="todo-page xp-page-fullwidth">
<div class="xp-bento">

<!-- 标题窗口 -->
<div class="todo-item-header">
<div class="xp-window">
<div class="xp-window-title">
<span class="xp-window-title-text"><svg class="inline-icon" width="16" height="16" aria-hidden="true"><use href="#icon-list"/></svg> 待办事项</span>
<span class="xp-window-btns" aria-hidden="true"><i class="xp-window-btn">_</i><i class="xp-window-btn">□</i><i class="xp-window-btn close">×</i></span>
</div>
<div class="xp-window-body header-body">
<p>记录想做的事和进度，完成一项就给自己一点成就感。</p>
<div class="header-stats">
<span class="header-chip"><strong>{% xp_num todo_doing %}</strong> 进行中</span>
<span class="header-chip"><strong>{% xp_num todo_todo %}</strong> 待做</span>
<span class="header-chip"><strong>{% xp_num todo_done %}</strong> 已完成</span>
</div>
</div>
</div>
</div>

<!-- 清单由 source/_data/todo.yml 生成（首页与杂谈页复用同一份数据） -->
{% xp_todo full %}

<!-- 提示框 -->
<div class="todo-item-tip">
<div class="xp-tip-box">
<strong><svg class="inline-icon" width="14" height="14" aria-hidden="true"><use href="#icon-bulb"/></svg> 小提示：</strong>
这一页、首页的「待办事项」和杂谈页的「待办清单」读的是同一份 source/_data/todo.yml，改一处三处都会同步。
</div>
</div>

</div>
</div>

<!-- ========== 页面级排布（组件样式统一在 /css/xp-custom.css） ========== -->
<style>
.todo-item-header,
.todo-item-tip { grid-column: 1 / -1; grid-row: span 1; }
.todo-item-section { grid-column: 1 / 4; grid-row: span 1; }
.todo-item-list { grid-column: 4 / -1; grid-row: span 1; }

@media (max-width: 900px) {
  .todo-item-section,
  .todo-item-list { grid-column: 1 / -1; }
}
</style>
