#!/usr/bin/env python3
"""生成站点的像素兔子站标（写入 <仓库>/source/favicon.ico 与 source/images/site-mark.svg）。

站标来源
    像素兔子字形来自 iconfont.cn 下载的图标字体（码位 U+ED20，名称「像素_兔子」）。
    ⚠ 那个 iconfont.ttf **没有提交进仓库**：iconfont.cn 上的图标协议各不相同、
    且下载包里没有附带授权文件，无法确认可否再分发。所以仓库里只保留
    **生成好的站标**（属于"可覆盖的资源"，与头像 / 壁纸同一类），
    字体本身留在你本机。

    想重新生成时，把那个 iconfont.ttf 放在下面任一位置即可（脚本会依次找）：
        D:\\Download\\font_zxvd6j58ddp\\iconfont.ttf   （默认，下载解压后的位置）
        <仓库>\\tools/images\\iconfont.ttf                   （想长期保存就放这儿）
    两处都没有时脚本会提示并**直接退出、不动现有站标** —— 免得手一滑把站标清空。

站标长什么样（2026-10-18 站主要求改版）
    · 兔子**轮廓保持不变**（还是那套像素字形，没有重画）
    · 实心填充，改成**上红下黄的竖向渐变**：顶部 #B7230E → 底部 #FDB921
    · **透明背景**（不再有红圆角底块，也不再画描边）
    渐变是在字形内部按行线性插值的，所以小尺寸下每一行颜色都是干净的纯色，
    不会出现半透明过渡行 —— 像素风要的就是这个。

产出两个文件
    source/favicon.ico          浏览器标签页 / 书签 / 桌面快捷方式（16 / 32 / 48 三档）
    source/images/site-mark.svg 透明 SVG 版站标，页面里可以直接 <img> 用（例如空状态）

用法（在仓库根目录；本机 python 是商店占位程序，所以用 py -3）
    py -3 tools/images\\make-favicon.py

为什么尺寸要 16/32/48 三档
    浏览器标签页用 16、任务栏/书签用 32、桌面快捷方式要 48。只做一档时
    系统会自己缩放，小图标会糊。
"""
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("缺少 Pillow 库。请安装：py -3 -m pip install Pillow")
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_ICO = os.path.join(ROOT, "source", "favicon.ico")
OUT_SVG = os.path.join(ROOT, "source", "images", "site-mark.svg")

GLYPH = chr(0xED20)            # 「像素_兔子」在 iconfont 里的码位
SIZES = (16, 32, 48)           # 标签页 / 任务栏书签 / 桌面快捷方式
CANDIDATES = (
    r"D:\Download\font_zxvd6j58ddp\iconfont.ttf",
    os.path.join(ROOT, "tools", "images", "iconfont.ttf"),
    os.path.join(ROOT, "source", "vendor", "iconfont", "iconfont.ttf"),
)

# 站主 2026-10-18 第七轮要求：白兔改回品牌橙（与任务栏 #icon-user 的 #E54E1F 一致）。
# （历史：#B7230E → #C44B4B → 白色 → 现在 #E54E1F。）
TOP = (0xE5, 0x4E, 0x1F)
BOTTOM = (0xE5, 0x4E, 0x1F)


def find_font():
    for p in CANDIDATES:
        if os.path.isfile(p):
            return p
    return None


def glyph_mask(n, font_path):
    """把字形渲染成 n×n 的 8 位掩码（255 = 兔子实心部分，0 = 透明）。

    先以 n 号字画一次，找出字形的实际包围盒（像素字形四周会留空），
    再**按包围盒重新缩放铺满整张画布** —— 否则 16px 档里兔子只有中间一小撮。
    """
    f = ImageFont.truetype(font_path, n)
    im = Image.new("L", (n, n), 0)
    ImageDraw.Draw(im).text((0, 0), GLYPH, font=f, fill=255)
    box = im.getbbox()
    if not box:
        return im
    pad = max(1, n // 16)                      # 四周留一点呼吸，别顶到画布边缘
    inner = n - pad * 2
    cropped = im.crop(box)
    w, h = cropped.size
    k = min(inner / w, inner / h)
    scaled = cropped.resize((max(1, round(w * k)), max(1, round(h * k))), Image.NEAREST)
    out = Image.new("L", (n, n), 0)
    out.paste(scaled, ((n - scaled.width) // 2, (n - scaled.height) // 2))
    return out


def render(size, font_path):
    """size×size 透明底的渐变兔子。整张画布铺满竖向渐变，再用字形当遮罩。"""
    S = size * 4                                # 4 倍超采样，边缘不毛
    mask = glyph_mask(S, font_path)
    grad = Image.new("RGBA", (S, S))
    px = grad.load()
    for y in range(S):
        t = y / max(1, S - 1)
        c = (
            round(TOP[0] + (BOTTOM[0] - TOP[0]) * t),
            round(TOP[1] + (BOTTOM[1] - TOP[1]) * t),
            round(TOP[2] + (BOTTOM[2] - TOP[2]) * t),
            255,
        )
        for x in range(S):
            px[x, y] = c
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)


def write_svg(n, font_path):
    """把字形写成「一行一个像素」的矩形网格 + 竖向渐变 —— 矢量、透明底、无依赖。"""
    f = ImageFont.truetype(font_path, n)
    im = Image.new("L", (n, n), 0)
    ImageDraw.Draw(im).text((0, 0), GLYPH, font=f, fill=255)
    box = im.getbbox()
    if box:
        im = im.crop(box)
    px = im.load()
    w, h = im.size
    # 合并同一行里连续的实心像素，压成尽量少的 <rect>（控制文件体积）
    rects = []
    for y in range(h):
        x = 0
        while x < w:
            if px[x, y] > 127:
                x0 = x
                while x < w and px[x, y] > 127:
                    x += 1
                rects.append((x0, y, x - x0, 1))
            else:
                x += 1
    hex_top = "#%02x%02x%02x" % TOP
    hex_bottom = "#%02x%02x%02x" % BOTTOM
    body = "".join('<rect x="%d" y="%d" width="%d" height="%d"/>' % r for r in rects)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
        'width="%d" height="%d" shape-rendering="crispEdges" role="img" aria-label="站标">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/>'
        "</linearGradient></defs>"
        '<g fill="url(#g)">%s</g></svg>\n'
    ) % (w, h, w, h, hex_top, hex_bottom, body)
    with open(OUT_SVG, "w", encoding="utf-8", newline="\n") as fp:
        fp.write(svg)


def main():
    font_path = find_font()
    if not font_path:
        print("找不到 iconfont.ttf（像素兔子站标的字形来源），没有改动任何站标文件。")
        print("请把它放到以下任一位置后重跑：")
        for p in CANDIDATES:
            print("   ", p)
        return 1

    # 每档都按目标尺寸原生渲染（不是从 16 放大），缩小尺寸下更清晰
    frames = [render(s, font_path) for s in SIZES]
    frames[-1].save(OUT_ICO, format="ICO", sizes=[(s, s) for s in SIZES])
    print("favicon.ico", os.path.getsize(OUT_ICO), "bytes", "（含尺寸 %s）"
          % ", ".join("%d" % s for s in SIZES))

    write_svg(48, font_path)
    print("site-mark.svg", os.path.getsize(OUT_SVG), "bytes")
    print("字形来源：", font_path)
    print("配色：#%02x%02x%02x 单色实心，透明背景" % TOP)
    return 0


if __name__ == "__main__":
    sys.exit(main())
