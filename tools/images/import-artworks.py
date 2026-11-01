#!/usr/bin/env python3
"""批量导入作品图 —— 一次把一整个文件夹的画变成「作品文章」。

用法（在仓库根目录运行；注意是 py -3，本机 python 是商店的占位程序）：

    # 先看一眼会发生什么（不写任何文件）
    py -3 tools/images\\import-artworks.py "D:\\我的画" --dry-run

    # 确认没问题再真导入
    py -3 tools/images\\import-artworks.py "D:\\我的画"

    # 常用可选项
    py -3 tools/images\\import-artworks.py "D:\\我的画\\2024" --category 插画 --origin 原创
    py -3 tools/images\\import-artworks.py "D:\\我的画" --tags "风景,数码绘画" --desc "早期练习"
    py -3 tools/images\\import-artworks.py "D:\\我的画" --force        # 覆盖已存在的同名作品

每张图会做四件事：
    1. 生成三档尺寸、每档 WebP + JPEG 两份（正文中图 800 / 放大图 1600 / 卡片缩略图 480，全部等比缩、不裁剪）
       —— 图片处理逻辑来自 tools/images/work_images.py（与 make-work-images.py 共用一份）
    2. 原图备份到 backup/images-original/works/  （不会丢原图）
    3. 直接写好 source/_posts/work-<短名>.md     （front matter 和正文都填好）
    4. 正文里用 <picture> 引好图（浏览器自动选 WebP，老旧浏览器回退 JPEG）

另外自动处理三件容易翻车的事：
    · 手机照片按 EXIF 方向位自动摆正（否则导入后横竖颠倒）
    · 透明底 PNG 自动铺白底（否则存成 JPG 后透明区域变黑）
    · 标题 / 简介里的特殊字符自动加引号（否则 YAML 写错，构建直接失败）

**日期**：优先取照片的 EXIF 拍摄时间，没有就用文件修改时间 —— 作品页的时间轴分期
是按日期分的，所以这个很重要。同一批里时间完全相同的会按顺序错开 1 秒，保证排序稳定。

**短名（slug）**：会成为网址，所以尽量用英文文件名（例如 `sunset.png` → `/work-sunset/`
…… 实际网址是 `/work-sunset/` 还是别的，取决于文章 front matter）。
文件名是纯中文时，无法自动变成英文，会用 `work-<哈希>` 兜底 —— 脚本会把这些列出来，
想改的话导入后改文件名或加一行 `permalink:` 就行。

跑完别忘了在菜单里按 `2` 重新生成，或者：

    npx hexo clean && npx hexo generate
"""
import argparse
import hashlib
import os
import re
import shutil
import sys
from datetime import datetime, timedelta

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

try:
    from PIL import Image, ImageOps
except ImportError:
    print("缺少 Pillow 库。请安装：py -3 -m pip install Pillow")
    sys.exit(1)

# 图片怎么处理只说一遍：多尺寸 + WebP/JPEG，全部等比缩不裁剪，都在这个共用模块里。
# （以前这里自己写了一份「长边 1200 + 长边 480」的 JPEG-only 逻辑，
#   和 make-work-images.py 各改各的 —— 现在统一到 work_images.py。）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import work_images as wi   # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG_DIR = os.path.join(ROOT, "source", "images", "works")
POST_DIR = os.path.join(ROOT, "source", "_posts")
BACKUP_DIR = os.path.join(ROOT, "backup", "images-original", "works")

EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff")


# 注：原来这里有一份本地的 fit / flatten / save_jpeg（JPEG-only、长边 1200+480）。
# 已删除，统一走 wi.save_all()（tools/images/work_images.py），避免两处逻辑各改各的。


def yq(value):
    """包成 YAML 双引号标量：文件名 / 简介里的 [ ] { } # * 等字符不会再弄坏 front matter
    （写错 YAML 构建会直接失败；标题若以 [ 开头还会被当成列表，现象更诡异）。"""
    s = str(value).replace("\\", "\\\\").replace('"', '\\"')
    return '"%s"' % s


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def backup_target(src, backup_dir):
    """备份文件落点：不同子文件夹里恰巧同名的图，内容不同就加短哈希区分，
    别让后一张把先一张的原图备份顶掉（原图备份是唯一一份，丢了就没救）。"""
    path = os.path.join(backup_dir, os.path.basename(src))
    if not os.path.exists(path) or md5_of(path) == md5_of(src):
        return path
    stem, ext = os.path.splitext(os.path.basename(src))
    return os.path.join(backup_dir, "%s-%s%s" % (stem, md5_of(src)[:6], ext))


def slugify(name):
    """文件名 → 网址短名。中文等非 ASCII 字符会被丢掉。"""
    s = os.path.splitext(name)[0].strip().lower()
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"[^a-z0-9-]+", "", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s


def exif_time(path):
    """返回 EXIF 里的拍摄时间；没有就返回 None。"""
    try:
        exif = Image.open(path).getexif()
        raw = exif.get(36867) or exif.get(306)   # DateTimeOriginal / DateTime
        if raw:
            return datetime.strptime(str(raw).strip(), "%Y:%m:%d %H:%M:%S")
    except Exception:
        pass
    return None


def collect(folder):
    files = []
    for dirpath, _dirnames, filenames in os.walk(folder):
        for name in sorted(filenames):
            if name.lower().endswith(EXTS) and not name.startswith("."):
                files.append(os.path.join(dirpath, name))
    return files


def main():
    ap = argparse.ArgumentParser(description="把一个文件夹里的画批量导入成作品文章")
    ap.add_argument("folder", help="图片文件夹（会递归子目录）")
    ap.add_argument("--category", default="插画", help="作品子分类，默认「插画」（决定作品页的筛选按钮）")
    ap.add_argument("--origin", default="原创", choices=["原创", "同人"], help="作品页的栏目，默认原创")
    ap.add_argument("--tags", default="", help="标签，逗号分隔，例如 风景,数码绘画")
    ap.add_argument("--desc", default="", help="一句话简介（所有作品共用；想单独写就导入后自己改）")
    ap.add_argument("--dry-run", action="store_true", help="只打印计划，不写任何文件")
    ap.add_argument("--force", action="store_true", help="已存在的作品也覆盖")
    ap.add_argument("--no-large", action="store_true",
                    help="不生成 1600 大图（省体积；不需要「点开放大」时用）")
    args = ap.parse_args()

    if not os.path.isdir(args.folder):
        print("找不到文件夹：%s" % args.folder)
        return 1

    files = collect(args.folder)
    if not files:
        print("这个文件夹里没找到图片（支持 %s）" % "、".join(EXTS))
        return 1

    if args.origin not in ("原创", "同人"):
        print("origin 只能填 原创 或 同人")
        return 1

    tags = [t.strip() for t in args.tags.split(",") if t.strip()]
    if not args.dry_run:
        os.makedirs(IMG_DIR, exist_ok=True)
        os.makedirs(POST_DIR, exist_ok=True)
        os.makedirs(BACKUP_DIR, exist_ok=True)

    print("共 %d 张图%s" % (len(files), "（演练，不写文件）" if args.dry_run else ""))
    print("")

    done, skipped, fallback = [], [], []
    last_ts = None
    bytes_total = 0     # 仓库里占用的素材（WebP + JPEG 都入库）
    user_bytes = 0      # 访客实际下载（只拿 WebP 那一份）
    for src in files:
        name = os.path.basename(src)
        title = os.path.splitext(name)[0]
        slug = slugify(name)
        if not slug:
            # 注意别在这里再加 work- 前缀：文章文件名本身就会加上（work-<slug>.md），
            # 加两次会变成 work-work-xxxxxx
            slug = "art-" + hashlib.md5(name.encode("utf-8")).hexdigest()[:6]
            fallback.append((name, slug))

        post_path = os.path.join(POST_DIR, "work-%s.md" % slug)
        if os.path.exists(post_path) and not args.force:
            skipped.append((name, os.path.basename(post_path)))
            continue

        when = exif_time(src) or datetime.fromtimestamp(os.path.getmtime(src))
        when = when.replace(microsecond=0)
        # 同一批里时间相同/倒退的（例如好几张图是同一分钟拷贝进来的）按顺序错开 1 秒：
        # 作品页的时间轴按日期排序，不这样处理，这几件的先后顺序会变得不确定。
        # 界面上只显示到"日"，所以看不出来，但排序稳定了。
        if last_ts is not None and when <= last_ts:
            when = last_ts + timedelta(seconds=1)
        last_ts = when
        stamp = when.strftime("%Y-%m-%d %H:%M:%S")

        if args.dry_run:
            done.append((name, slug, stamp))
            continue

        # exif_transpose：手机照片常用 EXIF 方向位记录「拍摄时把手机转了 90 度」，
        # 不处理的话导出来的主图 / 缩略图是横竖颠倒的（原图备份不受影响）。
        img = ImageOps.exif_transpose(Image.open(src))
        # 统一交给共用模块：中图 800 / 大图 1600 / 缩略图 480（全部等比缩、不裁剪），
        # 每档都出 WebP + JPEG 两份。返回 [(标签, webp, jpg, webp字节, jpg字节), ...]
        made = wi.save_all(img, IMG_DIR, slug, args.no_large)
        img.close()
        bytes_total += sum(wb + jb for _l, _wp, _jp, wb, jb in made)
        user_bytes += sum(wb for _l, _wp, _jp, wb, jb in made)

        backup_path = backup_target(src, BACKUP_DIR)
        if not os.path.exists(backup_path):
            shutil.copy2(src, backup_path)

        fm = [
            "---",
            "title: %s" % yq(title),
            "date: %s" % stamp,
            "categories: [%s, %s]" % (yq("作品"), yq(args.category)),
            "origin: %s" % yq(args.origin),
        ]
        if tags:
            fm.append("tags: [%s]" % ", ".join(yq(t) for t in tags))
        fm.append("short_title: %s" % yq(title))
        if args.desc:
            fm.append("desc: %s" % yq(args.desc))
        # 封面用缩略图（480 长边等比缩，不裁切 —— 瀑布流按实际比例显示）；
        # img 用中图而不是 1600 大图：img 会作为文章页顶部的大图加载，
        # 用 800 那份画质足够、体积小得多（想放大的读者走正文里的 <picture>）。
        fm += [
            "img: /images/works/%s-%d.jpg" % (slug, wi.MID_SIDE),
            "thumbnail: /images/works/%s-thumb.jpg" % slug,
            "status: done",
            "---",
            "",
            "## 作品简介",
            "",
            wi.picture_snippet(slug, title),
            "",
        ]
        with open(post_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(fm))
        done.append((name, slug, stamp))

    for name, slug, stamp in done:
        print("  ✓ %-28s → /work-%s/   %s" % (name[:28], slug, stamp))
    if skipped:
        print("")
        print("  跳过（已存在，想覆盖加 --force）：")
        for name, post in skipped:
            print("    - %-28s （已有 %s）" % (name[:28], post))
    if fallback:
        print("")
        print("  ⚠ 文件名是纯中文/符号，没法自动变英文短名，用了兜底短名：")
        for name, slug in fallback:
            print("    - %-28s → %s" % (name[:28], slug))
        print("    想改：导入后把 source/_posts/work-<短名>.md 改名，或在 front matter 里加一行 permalink:")

    print("")
    print("完成 %d 张%s。" % (len(done), "（演练未写文件）" if args.dry_run else ""))
    if not args.dry_run and done:
        print("")
        print("  仓库里占用的素材   %8.1f KB  （WebP + JPEG 都入库；JPEG 给老旧浏览器兜底）" % (bytes_total / 1024.0))
        print("  访客实际下载       %8.1f KB  （浏览器只拿 WebP 那一份）" % (user_bytes / 1024.0))
        print("")
        print("  每篇都生成了三档尺寸（中图 800 / 大图 1600 / 缩略图 480，等比不裁剪），")
        print("  文章正文里已经用 <picture> 引好了（自动选 WebP）。")
        print("  原图备份在：%s" % BACKUP_DIR)
        print("")
        print("接下来：关掉预览窗口 → 菜单按 [2] 看效果（或 npx hexo clean && npx hexo generate）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
