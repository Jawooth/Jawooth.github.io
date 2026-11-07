---
title: 作品
layout: xp-page
---

<!-- 注意：本页正文是整块原始 HTML，所有 xp_ 标签必须顶格书写。
     一旦某行缩进 4 个空格以上、且前面留了空行，markdown 会把它当成代码块，
     整段 HTML 会被转义成文本、xp_ 标签也不会生效。
     另外正文里不要出现字面的模板定界符——包括注释里也不行：
     标签在注释里照样会被执行一遍，白白复制一份 HTML（踩过）。 -->

<!-- 作品卡片由下方那个「作品集」标签自动生成（详见 README.md 第 10.3 节）：
       · 栏目（原创 / 同人）来自文章的 origin: 原创 或 origin: 同人（没写就是原创）
       · 瀑布流排版：封面按实际比例显示，卡片只含 封面/标题/简介(desc:)/标签
       · 标签筛选、屏蔽模式是页面内的交互，不需要额外配置；点卡片直接进作品页 -->

<div class="works-page xp-page-fullwidth">
<div class="xp-bento">

<!-- 标题窗口 -->
<div class="works-item works-header">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='我的作品集', icon='palette' }) %>
<div class="xp-window-body header-body">
<p>按时间倒序排列：先选「原创 / 同人」，再点标签只看某一类；点卡片直接进作品页。</p>
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
<%- include('./includes/xp-window-title', { title='作品集', icon='palette' }) %>
<div class="xp-window-body">
{% xp_work_gallery %}
</div>
</div>
</div>

<!-- 标签云 -->
<div class="works-item works-tags">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='标签云', icon='tag', compact=true, buttons=false }) %>
<div class="xp-window-body compact-body">
{% xp_tag_cloud pill %}
</div>
</div>
</div>

<!-- 创作统计 -->
<div class="works-item works-mini-stats">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='创作统计', icon='chart', compact=true, buttons=false }) %>
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

<!-- 创作中：2026-11-06 站主要求与其它窗口统一 —— 去掉了虚线外框、橙色标题栏
     与半透明，也去掉了内容里的「进行中」角标（标题已经写着「创作中」，
     角标是同一句话的第二次说法）。现在它只是一扇普通窗口。 -->
<div class="works-item works-upcoming">
<div class="xp-window">
<%- include('./includes/xp-window-title', { title='创作中', icon='clock' }) %>
<div class="xp-window-body">
<div class="upcoming-content">
<div class="upcoming-icon"><svg width="32" height="32" viewBox="0 0 16 16" aria-hidden="true"><use href="#icon-pencil"/></svg></div>
<p>下一幅作品正在酝酿中，敬请期待……</p>
</div>
</div>
</div>
</div>

</div>
</div>

<!-- 2026-11-04：播放器页内化。这一页是便当格页（没有侧栏），
     便当格里每格都排满了，塞播放器要动整张排布表 —— 所以放在页尾一条，
     和 /tags/、/categories/ 等单栏页保持一致的外观。 -->
<div class="xp-page-player">{% xp_music bar %}</div>

<style>
.works-header,
.works-gallery { grid-column: 1 / -1; grid-row: span 1; }
.works-tags       { grid-column: 1 / 5;  grid-row: span 1; }
.works-mini-stats { grid-column: 5 / 9;  grid-row: span 1; }
.works-upcoming   { grid-column: 9 / 13; grid-row: span 1; }

@media (max-width: 900px) {
  /* ★ 2026-10-18 修「窗口超出框外」：900px 断点下 .xp-bento 只剩 6 栏，
     原来的 1 / 7 没问题；但 5 / 9 与 9 / 13 会落到 6 栏网格之外（网格线号是显式的，
     不会自动夹回），于是卡片溢出到屏幕右侧。这里改成按列跨度分配。
     注意：本文件的 <style> 晚于 /css/xp-custom.css 加载，同特异性下以这里为准，
     所以 xp-custom.css 里那组 900px 兜底规则是给别的 12 栏页面用的，别指望它兜这里。 */
  .works-tags,
  .works-mini-stats,
  .works-upcoming { grid-column: auto / span 2; }
  .works-tags { grid-column: auto / span 6; }
  .works-mini-stats { grid-column: auto / span 3; }
  .works-upcoming { grid-column: auto / span 3; }
}
</style>
