# 两侧装饰图

把装饰图放在这个目录里，文件名保持：

- `left.png`  —— 左侧装饰
- `right.png` —— 右侧装饰

png / gif / webp / jpg 都行（动画 gif 也支持），只在 **窗口宽度 ≥ 1500px** 时显示。
想换文件名就改 `source/css/xp-custom.css` 顶部 `--decor-left` / `--decor-right` 两个变量。
不想要装饰就删掉这两个文件即可（路径不存在不会报错，只是看不到图）。
