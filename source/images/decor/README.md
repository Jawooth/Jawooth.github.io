# 两侧装饰图

图片放这个目录里，**排版在 `source/_data/decor.yml` 里配**（2026-10-13 起改成数据驱动，
不再是写死的 `left.png` / `right.png` 两个文件名）。

`decor.yml` 里每一项四个字段：

| 字段 | 说明 |
|---|---|
| `image` | 图片路径，写 `/images/decor/文件名`（png / gif / webp / jpg 都行，动图也支持） |
| `side` | `left` 或 `right` —— 贴哪一侧 |
| `top` | 距窗口顶部的距离，如 `120px` 或 `30%` |
| `width` | 显示宽度（像素数字，40–400），高度按原图比例自动 |

```yaml
items:
  - { image: "/images/decor/left.png",  side: "left",  top: "120px", width: 160 }
  - { image: "/images/decor/right.png", side: "right", top: "120px", width: 160 }
```

想加几张加几张；删掉某一项就是撤掉那张图；全部清空（保留 `items: []` 一行）则两侧不显示。

**只在窗口宽度 ≥ 1500px 的宽屏显示**，窄屏自动隐藏（两侧没有空间，不会报错）。
图不参与点击（`pointer-events: none`），不会挡住正文。

改完记得重新生成：`npx hexo clean && npx hexo generate`。
