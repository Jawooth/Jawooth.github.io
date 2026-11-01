#!/usr/bin/env python3
"""作品图处理的**共用逻辑**（被 make-work-images.py 与 import-artworks.py 调用）。

为什么单独抽成一个文件：
    两个脚本都要「按多档尺寸 + WebP/JPEG 双格式输出」。
    如果各写一份，改一处忘一处 —— 这个仓库已经吃过这种亏
    （比如 .post-detail 改名后 JS 没跟着改，功能静默失效）。
    所以：**图片怎么处理只说一遍，就在这里**。

调用方约定：
    save_all(img, prefix) -> 返回 [(标签, webp路径, jpg路径, webp字节, jpg字节), ...]
"""
import os

from PIL import Image

# ---------------------------------------------------------------- 尺寸与质量
# 三档尺寸，各有用途：
#   中图 800   正文里显示的那张（绝大多数情况看的就是它）
#   大图 1600  想「点开放大」时用（--no-large 可关掉）
#   缩略图 480 卡片封面，**等比缩、不裁剪** —— 作品页是瀑布流（2026-10-18
#              站主定稿），封面按实际比例完整显示；统一 480 长边只是为了
#              让封面这张素材比正文中图更小、省流量。
MID_SIDE = 800
LARGE_SIDE = 1600
THUMB_SIDE = 480

# 质量：WebP 天生比 JPEG 效率高，所以它的 quality 可以低一点还更好看
Q_JPEG_MID, Q_WEBP_MID = 82, 80
Q_JPEG_LARGE, Q_WEBP_LARGE = 84, 80
Q_JPEG_THUMB, Q_WEBP_THUMB = 80, 76


def has_alpha(img):
    return img.mode in ("RGBA", "LA") or (
        img.mode == "P" and "transparency" in img.info)


def flatten(img):
    """存 JPEG 前把透明铺到白底。
       直接 convert("RGB") 的话透明区域会变**黑**，不是变白。"""
    if has_alpha(img):
        rgba = img.convert("RGBA")
        base = Image.new("RGB", rgba.size, (255, 255, 255))
        base.paste(rgba, mask=rgba.split()[-1])
        return base
    return img.convert("RGB")


def fit(img, long_side):
    """按最长边等比缩放（**不裁剪**），只缩不放。全部档位都用这个，保证不变形。

    历史注记：缩略图曾按 4:3 居中裁剪（fit_box + THUMB_TOP_BIAS，为固定 4:3
    卡片框服务）。2026-10-19 站主要求脚本不再裁切 —— 作品页瀑布流按实际比例
    显示封面，裁剪失去了意义；原 fit_box 逻辑随需求一起删除（git 历史可查）。"""
    w, h = img.size
    scale = long_side / float(max(w, h))
    if scale >= 1:
        return img.copy()
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def save_pair(img, base_path, q_jpeg, q_webp):
    """同一张图存成 WebP + JPEG 两份。
       返回 (webp路径, jpeg路径, webp字节数, jpeg字节数)。
       WebP 保留透明（带 alpha 的插画不吃亏），JPEG 铺白底。"""
    webp_path = base_path + ".webp"
    jpeg_path = base_path + ".jpg"
    (img if has_alpha(img) else flatten(img)).save(webp_path, "WEBP", quality=q_webp, method=6)
    flatten(img).save(jpeg_path, "JPEG", quality=q_jpeg, optimize=True, progressive=True)
    return webp_path, jpeg_path, os.path.getsize(webp_path), os.path.getsize(jpeg_path)


def save_all(img, prefix_dir, prefix, no_large=False):
    """按三档尺寸输出全部素材。img 应当是**已经按 EXIF 摆正过**的图。

    返回 [(标签, webp路径, jpg路径, webp字节, jpg字节), ...]。
    调用方负责 os.makedirs 与统计体积。"""
    plans = [
        ("中图（正文）", os.path.join(prefix_dir, prefix + "-%d" % MID_SIDE),
         fit(img, MID_SIDE), Q_JPEG_MID, Q_WEBP_MID),
        ("缩略图（卡片封面）", os.path.join(prefix_dir, prefix + "-thumb"),
         fit(img, THUMB_SIDE), Q_JPEG_THUMB, Q_WEBP_THUMB),
    ]
    if not no_large:
        plans.append(("大图（点开放大）", os.path.join(prefix_dir, prefix + "-%d" % LARGE_SIDE),
                      fit(img, LARGE_SIDE), Q_JPEG_LARGE, Q_WEBP_LARGE))

    out = []
    for label, base, im, qj, qw in plans:
        wp, jp, wb, jb = save_pair(im, base, qj, qw)
        out.append((label, wp, jp, wb, jb))
    return out


def picture_snippet(prefix, alt=""):
    """给正文用的 <picture> 片段：浏览器自动选 WebP，老旧浏览器回退 JPEG。

    **为什么用裸相对路径、不带 /images/works/ 前缀**（2026-10-17 改成这样）：
        HexoHub 编辑器的内嵌 Markdown 预览没有站点上下文，绝对路径 /images/...
        在它那里会被解析成 tauri://localhost/images/... 从而显示不出图。
        图片放进文章自己的资源夹（source/_posts/<slug>/）后用裸相对路径，
        预览器能找到同目录的文件，真实站点也能正确解析。

    **为什么必须用原始 HTML 而不是 Markdown 的 ![alt](src)**：
        hexo-renderer-marked@7 会把 Markdown 图片的相对路径强制改写成根绝对路径
        （实测 ![](local.jpg) -> src="/local.jpg"，而图其实在 /<slug>/local.jpg，
        结果是 404）。原始 HTML 的 src 它原样保留，两条路才都通。
        这个结论是 2026-10-17 用无头浏览器实测得出的，不是推测。"""
    return (
        '<picture>\n'
        '  <source srcset="%s-%d.webp" type="image/webp">\n'
        '  <img src="%s-%d.jpg" alt="%s" loading="lazy" decoding="async">\n'
        '</picture>' % (prefix, MID_SIDE, prefix, MID_SIDE, alt)
    )
