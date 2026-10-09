"""生成站点的 favicon.ico 与像素风头像 avatar.png（写入 D:\\tools\\hexo\\source）。"""
import io
import struct
import os
from PIL import Image, ImageDraw

ROOT = r"D:\tools\hexo"
SRC = os.path.join(ROOT, "source")

# ---------------------------------------------------------------- favicon 16x16
def favicon_16():
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 15, 15], fill=(0, 84, 227, 255))           # 外框
    d.rectangle([1, 1, 14, 14], fill=(255, 255, 255, 255))        # 窗体
    for i, c in enumerate([(0, 88, 238), (53, 144, 243), (0, 88, 238), (0, 51, 153)]):
        d.rectangle([1, 1 + i, 11, 1 + i], fill=c + (255,))       # 标题栏 4 段渐变
    d.rectangle([11, 1, 13, 4], fill=(224, 67, 67, 255))          # 关闭按钮
    d.rectangle([11, 1, 11, 1], fill=(255, 255, 255, 255))
    # 窗体内容：像素调色板 2x2
    for (x, y), c in {(4, 8): (255, 102, 102), (8, 8): (102, 204, 102),
                      (4, 11): (102, 153, 255), (8, 11): (255, 204, 102)}.items():
        d.rectangle([x, y, x + 1, y + 1], fill=c + (255,))
    return im


def write_ico(path, base, sizes=(16, 32, 48)):
    frames = []
    for s in sizes:
        img = base if s == 16 else base.resize((s, s), Image.NEAREST)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        frames.append((s, buf.getvalue()))
    out = io.BytesIO()
    out.write(struct.pack("<HHH", 0, 1, len(frames)))
    offset = 6 + 16 * len(frames)
    for s, data in frames:
        out.write(struct.pack("<BBBBHHII", s if s < 256 else 0, s if s < 256 else 0,
                              0, 0, 1, 32, len(data), offset))
        offset += len(data)
    for _, data in frames:
        out.write(data)
    with open(path, "wb") as f:
        f.write(out.getvalue())


# ---------------------------------------------------------------- avatar 32x32
def avatar_32():
    im = Image.new("RGBA", (32, 32), (236, 233, 216, 255))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 31, 31], outline=(0, 84, 227, 255))
    SKIN, SKIN_D = (255, 204, 153, 255), (153, 102, 51, 255)
    HAIR = (139, 69, 19, 255)
    BODY, BODY_D = (102, 153, 204, 255), (51, 102, 153, 255)
    # 肩膀
    d.rectangle([6, 24, 25, 30], fill=BODY)
    d.rectangle([6, 24, 6, 30], fill=BODY_D)
    d.rectangle([25, 24, 25, 30], fill=BODY_D)
    d.rectangle([13, 24, 18, 25], fill=(255, 255, 255, 255))      # 领口
    # 头
    d.ellipse([9, 5, 22, 20], fill=SKIN, outline=SKIN_D)
    d.rectangle([10, 4, 21, 8], fill=HAIR)                        # 头发
    d.rectangle([9, 5, 9, 12], fill=HAIR)
    d.rectangle([22, 5, 22, 12], fill=HAIR)
    # 五官
    d.rectangle([12, 12, 13, 13], fill=(51, 51, 51, 255))
    d.rectangle([18, 12, 19, 13], fill=(51, 51, 51, 255))
    d.rectangle([14, 16, 17, 16], fill=(204, 102, 102, 255))
    d.rectangle([13, 17, 13, 17], fill=(204, 102, 102, 255))
    d.rectangle([18, 17, 18, 17], fill=(204, 102, 102, 255))
    return im


fav = os.path.join(SRC, "favicon.ico")
write_ico(fav, favicon_16())
print("favicon.ico", os.path.getsize(fav), "bytes")

os.makedirs(os.path.join(SRC, "images"), exist_ok=True)
av = os.path.join(SRC, "images", "avatar.png")
avatar_32().resize((256, 256), Image.NEAREST).save(av, optimize=True)
print("avatar.png", os.path.getsize(av), "bytes")
