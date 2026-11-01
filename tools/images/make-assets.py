"""生成样例头像 avatar-sample.png（写入 <仓库>/source/images）。

⚠ favicon.ico 已**不在这里生成**（2026-10-15 移出）：
   它现在由 tools/images/make-favicon.py 从「像素兔子」图标字体渲染。
   留在这里的话，跑一次这个脚本就会把兔子站标覆盖回旧的"蓝窗口"设计 ——
   那种"改对了、又被另一个工具悄悄改回去"的坑，本站踩过不止一次，所以直接移走。
"""
import os
import sys
from PIL import Image, ImageDraw

# Windows 控制台默认 GBK，中文输出会变成乱码
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

# 从脚本位置反推仓库根目录（本文件在 <仓库>/tools/images/ 下），
# 这样把仓库挪到别的盘或别的路径也能直接用，不必改代码。
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "source")

# （favicon 的生成已移出本脚本，见文件头说明；这里只剩样例头像）
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


# ⚠ favicon.ico 不在这里生成（见文件头）：跑一次本脚本不会再碰站标。
os.makedirs(os.path.join(SRC, "images"), exist_ok=True)

# ⚠️ 这里**故意不写** source/images/avatar.png：
# 那是主题自带的占位头像（themes/minimalism/source/images/avatar.png），
# 主题资源在站点资源之后写入，同名文件会被它覆盖；文档也反复写「不要用 avatar.png」。
# 这个脚本以前会生成它，结果只在 source/images/ 里留下一个 954 字节的孤儿文件
# （未跟踪、也不会生效），既不生效又容易让人以为换过头像。
# 站点真正用的是 source/images/site-avatar.png（由 profile.yml / 主题配置指向）。
# 因此样例头像改名输出，避免再与主题占位图撞名。
av = os.path.join(SRC, "images", "avatar-sample.png")
avatar_32().resize((256, 256), Image.NEAREST).save(av, optimize=True)
print("avatar-sample.png", os.path.getsize(av), "bytes")
print("（真正的头像请覆盖 source/images/site-avatar.png，不要用 avatar.png）")
