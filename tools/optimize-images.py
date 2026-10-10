"""压缩 <仓库>/source/images 下的图片，并生成卡片缩略图 / 对比用草稿图。

策略：
- 作品原图：长边压到 1200（4:3 → 1200x900，3:4 → 900x1200），JPEG q84 progressive
- 卡片缩略图：*-thumb.jpg，长边 480，q80
- 桌面背景：长边压到 1920（保持原始比例），q80
- 额外生成 landscape-v1.jpg（去饱和 + 降对比）用于文章里的"第一版 vs 最终版"对比
原始文件在动手前统一备份到 <仓库>/backup/images-original/

用法（在仓库根目录）：
    py -3 tools/optimize-images.py

注意：这个脚本会**原地覆盖** source/images 下的图，所以每次都先备份原图。
新增作品图建议改用 tools/add-artwork.py（只生成新文件，不改动已有图）。
"""
import os
import shutil
import sys
from PIL import Image, ImageEnhance

# Windows 控制台默认 GBK，中文输出会是乱码
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

# 从脚本位置反推仓库根目录，换机器/换路径也不用改代码
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "source", "images")
BAK = os.path.join(ROOT, "backup", "images-original")
os.makedirs(BAK, exist_ok=True)

# 需要"原图 + 缩略图"两套的作品（跟 source/_posts 里的 img/thumbnail 对应）。
# 加了新作品，把它的英文短名（source/images/works/<短名>.jpg）追加到这里。
WORKS = ["sketch", "landscape", "character"]

skipped = []


def backup(path):
    """只备份一次：已存在备份就不覆盖，避免第二次运行把压缩后的图当原图存进去。"""
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


for name in WORKS:
    src = os.path.join(IMG, "works", name + ".jpg")
    if not os.path.exists(src):
        skipped.append("works/%s.jpg" % name)
        continue
    before = os.path.getsize(src)
    backup(src)
    im = Image.open(src)
    save_jpeg(fit(im, 1200), src, 84)
    report(src, before)

    thumb = os.path.join(IMG, "works", name + "-thumb.jpg")
    save_jpeg(fit(im, 480), thumb, 80)
    print("%-46s %7s    -> %7.1f KB" % (os.path.relpath(thumb, ROOT), "-", os.path.getsize(thumb) / 1024))

# 对比用"第一版"草稿（只依赖 landscape 原图，缺了就跳过）
src = os.path.join(IMG, "works", "landscape.jpg")
if os.path.exists(src):
    im = Image.open(src)
    v1 = ImageEnhance.Color(im).enhance(0.45)
    v1 = ImageEnhance.Contrast(v1).enhance(0.85)
    v1 = ImageEnhance.Brightness(v1).enhance(0.95)
    dst = os.path.join(IMG, "works", "landscape-v1.jpg")
    save_jpeg(fit(v1, 900), dst, 80)
    print("%-46s %7s    -> %7.1f KB" % (os.path.relpath(dst, ROOT), "-", os.path.getsize(dst) / 1024))
else:
    skipped.append("works/landscape.jpg（第一版对比图）")

# 桌面背景
src = os.path.join(IMG, "xp-desktop-bg.jpg")
if os.path.exists(src):
    before = os.path.getsize(src)
    backup(src)
    im = Image.open(src)
    save_jpeg(fit(im, 1920), src, 80)
    report(src, before)
else:
    skipped.append("xp-desktop-bg.jpg")

print("\nbackup ->", BAK)
if skipped:
    print("跳过（文件不存在，未做任何改动）：%s" % "、".join(skipped))
