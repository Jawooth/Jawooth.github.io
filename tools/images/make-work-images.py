#!/usr/bin/env python3
"""作品图处理（单篇：一张或多张）—— 生成多尺寸 + WebP/JPEG 双格式素材。

**图片处理逻辑在 tools/images/work_images.py**（与批量导入脚本共用，只维护一份）。

产物（以 slug = sunset 为例）：
    source/images/works/sunset-800.webp    中图（正文用，最长边 800）
    source/images/works/sunset-800.jpg     ↑ 的 JPEG 回退
    source/images/works/sunset-1600.webp   大图（点开放大用，最长边 1600）
    source/images/works/sunset-1600.jpg
    source/images/works/sunset-thumb.webp  缩略图（卡片封面，等比缩、不裁剪）
    source/images/works/sunset-thumb.jpg
多张图时依次为 sunset-800 / sunset-2-800 / sunset-3-800 ……

用法（在仓库根目录；注意是 py -3，本机 python 是商店占位程序）：
    # 单张
    py -3 tools/images\\make-work-images.py "D:\\我的画\\小屋.png" sunset

    # 一篇作品多张图（自动编号）
    py -3 tools/images\\make-work-images.py "D:\\我的画\\过程1.png" "D:\\我的画\\过程2.png" process

    # 不生成 1600 大图（省体积）
    py -3 tools/images\\make-work-images.py "D:\\我的画\\x.png" x --no-large

    # 先看计划不写文件
    py -3 tools/images\\make-work-images.py "D:\\我的画\\x.png" x --dry-run

**这个脚本只生成图片 + 打印 front matter，不写文章文件。**
要「一次导入一整个文件夹、并自动写好每篇作品文章」，用 import-artworks.py。

原图会备份到 backup/images-original/works/（该目录不进仓库），所以母版永远在。
"""
import argparse
import os
import shutil
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

try:
    from PIL import Image, ImageOps
except ImportError:
    print("缺少 Pillow 库。请安装：pip install Pillow")
    sys.exit(1)

# 共用模块在同目录：把 tools/images/ 加进 import 路径，
# 这样从仓库根目录直接 py -3 tools\images\xxx.py 也能 import 到。
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import work_images as wi   # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG_DIR = os.path.join(ROOT, "source", "images", "works")
BACKUP_DIR = os.path.join(ROOT, "backup", "images-original", "works")


def human(n):
    return "%7.1f KB" % (n / 1024.0)


def main():
    ap = argparse.ArgumentParser(description="生成作品图（多尺寸 + WebP/JPEG）")
    ap.add_argument("sources", nargs="+", help="源图片（可多张，表示同一篇作品的多张图）")
    ap.add_argument("slug", help="英文短名（会成为文件前缀），例如 landscape-cottage")
    ap.add_argument("--no-large", action="store_true", help="不生成 1600 大图（省体积）")
    ap.add_argument("--dry-run", action="store_true", help="只打印计划，不写任何文件")
    args = ap.parse_args()

    slug = args.slug.strip()
    if not slug or any(c for c in slug if not (c.isalnum() or c in "-_")):
        print("英文短名只能包含英文字母、数字、短横线或下划线")
        sys.exit(1)

    for s in args.sources:
        if not os.path.exists(s):
            print("找不到图片：%s" % s)
            sys.exit(1)

    os.makedirs(IMG_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)

    total_before = sum(os.path.getsize(s) for s in args.sources)
    total_after = 0        # WebP + JPEG 两份都在磁盘上（仓库里确实占这些）
    user_download = 0      # 访客实际下载量：只挑一份（WebP 优先），这才是体验相关
    multi = len(args.sources) > 1

    print("作品短名：%s    共 %d 张图" % (slug, len(args.sources)))
    print("原图合计：%s" % human(total_before))
    print("")

    for i, src in enumerate(args.sources):
        # 第 1 张用 slug 本身，第 2 张起加序号：sunset / sunset-2 / sunset-3
        prefix = slug if i == 0 else "%s-%d" % (slug, i + 1)
        if multi:
            print("—— 第 %d 张：%s  →  前缀 %s" % (i + 1, os.path.basename(src), prefix))

        # exif_transpose：手机照片用 EXIF 方向位记录「拍的时候转了 90 度」，
        # 不处理的话导出后横竖颠倒（原图备份不受影响）。
        img = ImageOps.exif_transpose(Image.open(src))

        # 备份原图（只在没备份过时复制，避免第二次把处理后的图当原图存进去）
        bak = os.path.join(BACKUP_DIR, os.path.basename(src))
        if not args.dry_run and not os.path.exists(bak):
            shutil.copy2(src, bak)

        if args.dry_run:
            for label, im in (("中图（正文）", wi.fit(img, wi.MID_SIDE)),
                              ("缩略图（卡片封面）", wi.fit(img, wi.THUMB_SIDE)),
                              ("大图（点开放大）", wi.fit(img, wi.LARGE_SIDE))):
                if args.no_large and "大图" in label:
                    continue
                print("  [计划] %-20s %s  %dx%d" % (
                    label, os.path.join("source", "images", "works", prefix), im.size[0], im.size[1]))
            print("")
            continue

        for label, wp, jp, wb, jb in wi.save_all(img, IMG_DIR, prefix, args.no_large):
            total_after += wb + jb
            user_download += wb        # 浏览器优先拿 WebP，按它算"访客实际下载"
            print("  %-20s %-44s webp %s | jpg %s" % (
                label, os.path.relpath(wp, ROOT), human(wb), human(jb)))
        print("")

    if args.dry_run:
        print("（--dry-run：没有写入任何文件）")
        return

    print("=" * 72)
    print("原图合计            %s   （上传前的大小）" % human(total_before))
    print("访客实际下载        %s   （浏览器只拿 WebP 那一份，这才是体验相关）" % human(user_download))
    print("仓库里占用的素材     %s   （WebP + JPEG 都入库；JPEG 给老旧浏览器兜底）" % human(total_after))
    print("")
    print("注：单张作品图从「几 MB 原图」压到这个量级 = 体积降到原来的 %.1f%%，" % (
        (user_download / total_before * 100) if total_before else 0))
    print("    清晰度按「长边 800/1600」保留，和原图的差别在正常浏览距离下看不出来。")
    print("原图已备份到：%s" % BACKUP_DIR)
    print("")
    print("接下来在文章正文里这样引用（<picture> 自动选 WebP，老旧浏览器回退 JPEG）：")
    print("")
    for i in range(len(args.sources)):
        prefix = slug if i == 0 else "%s-%d" % (slug, i + 1)
        print(wi.picture_snippet(prefix, "作品说明"))
        print("")
    print("front matter 里这样填（front matter 是什么见 README 第 2.4 节）：")
    print("  thumbnail: /images/works/%s-thumb.jpg" % slug)
    print("  img: /images/works/%s-%d.jpg" % (slug, wi.LARGE_SIDE))
    print("")
    print("最后重新构建：npx hexo clean && npx hexo generate")


if __name__ == "__main__":
    main()
