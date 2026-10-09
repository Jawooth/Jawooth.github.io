#!/usr/bin/env python3
"""作品图导入工具 —— 把你的画变成站点需要的「主图 + 缩略图」，并打印 front matter。

用法（在仓库根目录运行）：

    python tools/add-artwork.py "D:\\我的画\\山间小屋.png" landscape-cottage

    # 可选参数
    python tools/add-artwork.py <图片路径> <英文短名> --title "风景插画·山间小屋" --desc "一句话简介"

它会做四件事：
    1. 生成 source/images/works/<英文短名>.jpg      —— 文章页大图（长边 1200，JPEG 质量 84）
    2. 生成 source/images/works/<英文短名>-thumb.jpg —— 卡片缩略图（长边 480，质量 80）
    3. 把原图备份到 backup/images-original/works/   —— 不会丢原图
    4. 打印一段可以直接粘贴进新文章 front matter 的字段

英文短名（slug）会成为文章的网址，所以请只用英文、数字和短横线，例如 landscape-cottage。
"""
import argparse
import os
import shutil
import sys

try:
    from PIL import Image
except ImportError:
    print("缺少 Pillow 库。请安装：pip install Pillow")
    print("或用本机已带 Pillow 的 Python 运行本脚本。")
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "source", "images", "works")
BACKUP_DIR = os.path.join(ROOT, "backup", "images-original", "works")


def fit(img, long_side):
    w, h = img.size
    scale = long_side / float(max(w, h))
    if scale >= 1:
        return img.copy()
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def save_jpeg(img, path, quality):
    img.convert("RGB").save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def main():
    parser = argparse.ArgumentParser(description="把一张画导入站点（生成主图 + 缩略图）")
    parser.add_argument("source", help="源图片路径（png/jpg/webp 都行）")
    parser.add_argument("slug", help="英文短名，会变成网址，例如 landscape-cottage")
    parser.add_argument("--title", default="", help="文章标题（可中文）")
    parser.add_argument("--desc", default="", help="一句话简介，会显示在作品卡片上")
    args = parser.parse_args()

    if not os.path.exists(args.source):
        print("找不到图片：%s" % args.source)
        sys.exit(1)

    slug = args.slug.strip()
    if not slug or any(c for c in slug if not (c.isalnum() or c in "-_")):
        print("英文短名只能包含英文字母、数字、短横线或下划线，例如：landscape-cottage")
        sys.exit(1)

    os.makedirs(IMG_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)

    before = os.path.getsize(args.source)
    img = Image.open(args.source)

    main_path = os.path.join(IMG_DIR, slug + ".jpg")
    thumb_path = os.path.join(IMG_DIR, slug + "-thumb.jpg")

    save_jpeg(fit(img, 1200), main_path, 84)
    save_jpeg(fit(img, 480), thumb_path, 80)

    backup_path = os.path.join(BACKUP_DIR, os.path.basename(args.source))
    if not os.path.exists(backup_path):
        shutil.copy2(args.source, backup_path)

    def kb(p):
        return os.path.getsize(p) / 1024.0

    print("")
    print("完成：")
    print("  原图      %8.1f KB  %s" % (before / 1024.0, args.source))
    print("  主图      %8.1f KB  source/images/works/%s.jpg        （长边 1200）" % (kb(main_path), slug))
    print("  缩略图    %8.1f KB  source/images/works/%s-thumb.jpg  （长边 480，卡片用）" % (kb(thumb_path), slug))
    print("  原图备份  %s" % backup_path)
    print("")
    print("接下来：新建一篇文章（npx hexo new post \"%s\"），front matter 照下面填：" % (args.title or slug))
    print("-" * 62)
    print("title: %s" % (args.title or slug))
    print("date: %s" % "YYYY-MM-DD HH:mm:ss")
    print("categories: [作品, 插画]        # 第二个是子分类，作品页的筛选按钮由它生成")
    print("tags: [风景, 数码绘画]")
    print("short_title: %s" % (args.title or slug))
    print("desc: %s" % (args.desc or "一句话介绍这幅画"))
    print("img: /images/works/%s.jpg" % slug)
    print("thumbnail: /images/works/%s-thumb.jpg" % slug)
    print("status: done                    # done 或 doing")
    print("-" * 62)
    print("")
    print("最后重新构建（注意一定要带 clean，否则数据文件改动不会生效）：")
    print("  npx hexo clean && npx hexo generate")
    print("")


if __name__ == "__main__":
    main()
