---
title: 游戏/工具
layout: xp-page
---

<div class="app-page xp-page-fullwidth">
<div class="xp-bento">

<!-- ★ 2026-10-18 站主要求（p4）：PC 端「小游戏」和「小工具」两个窗口并排，手机端不变。
     ★ 2026-11-01 站主要求：「工具」并入「游戏」—— 本页成为两组合一的唯一入口，
     导航/开始菜单不再单列「工具」，/tools/ 跳转到本页。

     结构上分两层：
       .app-header   蓝条（在宽屏里横跨两行，保持原来的位置和高度不变）
       .app-pane     一块「窗口 + 卡片」的容器；模板在宽屏时给它 span 6，
                     也就是两栏并排；窄屏时各占整行，从上到下堆叠（原来的样子）。

     卡片和窗口由 scripts/xp-content.js 的 {% xp_apps pane … %} 生成：
       xp_apps pane games     → 本页自己的窗口（标题「小游戏」、卡片也是本页的）
       xp_apps pane tool  → 兄弟窗口（工具页里放游戏、游戏页里放工具）
     数据都在 source/_data/apps.yml，改卡片内容不用碰这个文件。 -->
<div class="app-item app-header">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='游戏 / 工具', icon='gamepad' }) %>
<div class="xp-window-body header-body">
<p>摸鱼专用区 + 小工具区。目前都还在开发中，卡片上的「开发中」标记表示还不能点。</p>
<div class="header-stats">
<span class="header-chip"><strong>{% xp_num apps_game %}</strong> 个小游戏</span>
<span class="header-chip"><strong>{% xp_num apps_tool %}</strong> 个小工具</span>
</div>
</div>
</div>
</div>

<!-- 左：本页的窗口；右：兄弟窗口。两块的样式完全一样，只有内容和标题不同。 -->
<div class="app-item app-row">

{% xp_apps pane games games %}

{% xp_apps pane tool games %}

<!-- 2026-11-07 占位说明（README 14.1 ⑥）：卡片全是 planned，内容到卡片底就结束，
     下面大半屏是壁纸 —— 空白得有一条收尾的话，才像「有意留白」而不是加载坏了。
     放在 .xp-bento 里占整行（grid-column: 1/-1），与上面卡片同容器同 gap，不用另管边距。
     文案刻意不写数字（apps.yml 加减卡片这里不会跟着错）；图标由 xp-enhance.js
     按页扫描 <use> 自动进 sprite，不用登记。 -->
<p class="app-wip-note">
<svg width="1.1em" height="1.1em" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><use href="#icon-todo-pending"/></svg>
都还在做 —— 卡片先摆出来占个位，做完一个上线一个。
</p>

</div>

</div>
</div>

<!-- 2026-11-04：播放器页内化。这一页是便当格页（没有侧栏），
     便当格里只有「游戏 / 工具」标题条与两栏卡片，插进网格会破坏并排结构 ——
     所以放在页尾一条，与 /works/、/tags/、/categories/ 保持同一外观。 -->
<div class="xp-page-player">{% xp_music bar %}</div>
