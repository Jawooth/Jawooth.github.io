"""压缩 <仓库>/source/images 下的图片，并生成卡片缩略图 / 对比用草稿图。

策略：
- 作品原图：长边压到 1200（4:3 → 1200x900，3:4 → 900x1200），JPEG q84 progressive
- 卡片缩略图：*-thumb.jpg，长边 480，q80
- 桌面背景：长边压到 1920（保持原始比例），q80
- 额外生成 landscape-v1.jpg（去饱和 + 降对比）用于文章里的"第一版 vs 最终版"对比
原始文件在动手前统一备份到 <仓库>/backup/images-original/

用法（在仓库根目录）：
    py -3 tools/images/optimize-images.py

注意：这个脚本会**原地覆盖** source/images 下的图，所以每次都先备份原图。
新增作品图请用 tools/images/make-work-images.py（单张/多图）或 tools/images/import-artworks.py（批量）；
这个脚本只用于「压缩站内已有的图」（头像、壁纸、早期作品图那些）。
"""
import os
import shutil
import sys
from PIL import Image, ImageEnhance

# 复用共用模块的 fit/flatten（图片怎么处理只说一遍，见 work_images.py）。
# tools/images 不是 Python 包（无 __init__.py），手动把目录加进 sys.path。
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from work_images import fit, flatten  # noqa: E402

# Windows 控制台默认 GBK，中文输出会是乱码
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

# 从脚本位置反推仓库根目录，换机器/换路径也不用改代码
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
    # flatten（白底铺底）来自 work_images.py：直接 convert("RGB") 会让透明区域变黑
    flatten(im).save(path, "JPEG", quality=quality, optimize=True, progressive=True)


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

# 桌面背景：现役文件是 xp-desktop-bg.webp（2026-10-19 起，见 README 3.1）。
# 这里不再处理壁纸 —— 脚本只吃 jpg 源图，而 webp 母版不该被 jpg 有损链再压一遍。
# （若以后换新壁纸：先把新图转成 2560 宽 webp 放进 source/images/ 即可，勿恢复本段。）

print("\nbackup ->", BAK)
if skipped:
    print("跳过（文件不存在，未做任何改动）：%s" % "、".join(skipped))
