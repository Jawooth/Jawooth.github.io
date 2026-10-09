"""压缩 D:\\tools\\hexo\\source\\images 下的图片，并生成卡片缩略图 / 对比用草稿图。

策略：
- 作品原图：长边压到 1200（4:3 → 1200x900，3:4 → 900x1200），JPEG q84 progressive
- 卡片缩略图：*-thumb.jpg，长边 480，q80
- 桌面背景：1920x1080，q80
- 额外生成 landscape-v1.jpg（去饱和 + 降对比）用于文章里的"第一版 vs 最终版"对比
原始文件在动手前统一备份到 D:\\tools\\hexo\\backup\\images-original\\
"""
import os
import shutil
from PIL import Image, ImageEnhance

ROOT = r"D:\tools\hexo"
IMG = os.path.join(ROOT, "source", "images")
BAK = os.path.join(ROOT, "backup", "images-original")
os.makedirs(BAK, exist_ok=True)


def backup(path):
    rel = os.path.relpath(path, IMG)
    dst = os.path.join(BAK, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst):
        shutil.copy2(path, dst)


def report(path, before):
    print("%-46s %7.1f KB -> %7.1f KB" % (
        os.path.relpath(path, ROOT), before / 1024, os.path.getsize(path) / 1024))


def save_jpeg(im, path, quality):
    im.convert("RGB").save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def fit(im, long_side):
    w, h = im.size
    scale = long_side / float(max(w, h))
    if scale >= 1:
        return im.copy()
    return im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


works = ["sketch", "landscape", "character"]
for name in works:
    src = os.path.join(IMG, "works", name + ".jpg")
    before = os.path.getsize(src)
    backup(src)
    im = Image.open(src)
    save_jpeg(fit(im, 1200), src, 84)
    report(src, before)

    thumb = os.path.join(IMG, "works", name + "-thumb.jpg")
    save_jpeg(fit(im, 480), thumb, 80)
    print("%-46s %7s    -> %7.1f KB" % (os.path.relpath(thumb, ROOT), "-", os.path.getsize(thumb) / 1024))

# 对比用"第一版"草稿
src = os.path.join(IMG, "works", "landscape.jpg")
im = Image.open(src)
v1 = ImageEnhance.Color(im).enhance(0.45)
v1 = ImageEnhance.Contrast(v1).enhance(0.85)
v1 = ImageEnhance.Brightness(v1).enhance(0.95)
dst = os.path.join(IMG, "works", "landscape-v1.jpg")
save_jpeg(fit(v1, 900), dst, 80)
print("%-46s %7s    -> %7.1f KB" % (os.path.relpath(dst, ROOT), "-", os.path.getsize(dst) / 1024))

# 桌面背景
src = os.path.join(IMG, "xp-desktop-bg.jpg")
before = os.path.getsize(src)
backup(src)
im = Image.open(src)
save_jpeg(fit(im, 1920), src, 80)
report(src, before)

print("\nbackup ->", BAK)
