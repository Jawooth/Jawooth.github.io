---
title: {{ title }}
date: {{ date }}
tags:
---

<!--
  ↑ 上面 --- 之间的部分是「文章属性」(front matter)，常用字段：
     title   标题        date   日期(决定排序和网址)
     tags    标签        categories  分类，写 [作品, 插画] 就是一件作品
     origin  作品的栏目：原创 或 同人
     desc    一句话简介（显示在卡片上）
     thumbnail  卡片封面，例如 /images/works/xxx-thumb.jpg
     sticky  置顶数字，越大越靠前（只影响「文字」列表的排序，不写=不置顶）
     permalink  短网址，发布后就别再改（改了旧链接会失效）
     password  给这篇文章上锁（不写=公开）。加了之后要输密码才能看正文，
               列表页的标题和 desc 照常显示，标题右侧会出现锁形图标。
               用法与边界见 README.md 第 5.1 节。

  ⚠ 两个踩过的坑：
     1. 简介字段是 desc，本站没有 excerpt 字段。HexoHub 的「摘要」框填出来的
        就是 excerpt，本站不认 —— 用了摘要框的话，发布后要手动把 excerpt 改成 desc。
     2. 正文里链接另一篇文章用 post_link 标签，参数填**文件名（去掉 .md）或标题**，
        别填 permalink 的值，填错构建会直接报 Post not found。

  正文从这行下面开始写，每行**顶格**，不要缩进 4 个空格：
    缩进 4 空格的行会被 Markdown 当成**代码块**，整段文字变成灰底等宽字。
    代码才需要缩进（而且要用 ``` 包起来）。
  本注释不会出现在网站上，嫌占地方可直接删。字段逐项说明见 README.md 第 2.4 节。
-->
