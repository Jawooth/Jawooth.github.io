"""安装站点用的像素字体（Fusion Pixel 12px + Fusion Bold 12px）。

用法（在仓库根目录，参数是解压出来的两个 woff2 文件）：

    py -3 tools/fonts\\make-pixel-fonts.py ^
        <解压目录>\\fusion-pixel-12px-proportional-zh_hans.otf.woff2 ^
        <解压目录>\\fusion-bold-pixel-12px-proportional-zh_hans.otf.woff2

字体从哪来：<https://github.com/TakWolf/fusion-pixel-font> 与
<https://github.com/pixel-font-studio/fusion-bold-pixel-font> 的 Releases，
下载 `*-12px-proportional-otf.woff2-*.zip` 解压即可。两者都是 **SIL OFL 1.1**。

为什么要有这个脚本（而不是直接复制文件）：

  1. **正文**用的 Fusion Pixel 12px 裁成子集：**GB2312 常用字 + 仓库里实际出现过的
     所有非 ASCII 字符**（2026-10-12 前是全量 650KB；全量文件已备份到
     backup/fusion-pixel-12px-proportional-zh_hans-full.woff2，想恢复就复制回去）。
     代价：新文章出现未收录字符会掉系统字体。**配套**：tools/check\\verify-site.py 第 7 节
     每次构建都会算「文章用字 ∩ 字体覆盖」，缺字时会提醒重跑本脚本 —— 两边好处都拿到。
     把「仓库里实际出现过的字」算进去，是为了站主名字里那种 GB2312 之外的
     生僻字（例如「誩」「嬷」）不会掉出去、换成系统字体。

  2. **标题**用的 Fusion Bold 12px 只渲染首页网名和侧栏用户名这几个字，
     完整文件却有约 660 KB，为几个字驮 660 KB 不划算。同样裁成子集：
     **GB2312 常用字 + 仓库里实际出现过的所有非 ASCII 字符**。

  3. 以后**改了网名或加了新的生僻字**，重跑一遍这个脚本就行了。

许可证：两个字体的 OFL.txt 会一起复制到 source/fonts/。OFL 要求随附，
**别删**。Fusion 的 OFL 没有声明 Reserved Font Name，因此裁剪是被允许的。
"""

import os
import shutil
import sys

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT_DIR = os.path.join(ROOT, "source", "fonts")

BODY_NAME = "fusion-pixel-12px-proportional-zh_hans.woff2"
BOLD_NAME = "fusion-bold-pixel-12px-proportional-zh_hans-subset.woff2"
BODY_FULL_BACKUP = os.path.join(ROOT, "backup", "fusion-pixel-12px-proportional-zh_hans-full.woff2")


def gb2312_chars():
    """GB2312 里的字符 + ASCII + 中英文标点。"""
    out = set(chr(cp) for cp in range(0x20, 0x7F))
    for cp in list(range(0x3000, 0x3040)) + list(range(0xFF00, 0xFF65)):
        out.add(chr(cp))
    for hi in range(0xA1, 0xFE):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                continue
    return out


def repo_chars():
    """扫一遍仓库里实际出现过的非 ASCII 字符（内容 + 配置 + 文档 + 样式/脚本里的符号）。"""
    out = set()
    for sub in ("source", "."):
        base = os.path.join(ROOT, sub)
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames
                           if d not in {"node_modules", "public", ".git", "backup", "__pycache__"}]
            if dirpath.startswith(os.path.join(ROOT, "public")):
                continue
            for name in filenames:
                if not name.lower().endswith((".md", ".yml", ".yaml", ".json", ".ejs", ".js", ".css", ".styl")):
                    continue
                try:
                    with open(os.path.join(dirpath, name), encoding="utf-8", errors="ignore") as fh:
                        out.update(c for c in fh.read() if ord(c) > 127)
                except OSError:
                    continue
        if sub == "source":
            break
    return out


def subset_to(src, dst, keep):
    subset.main([
        src,
        "--output-file=" + dst,
        "--flavor=woff2",
        "--layout-features=*",
        "--no-hinting",
        "--desubroutinize",
        "--unicodes=" + ",".join("U+%04X" % ord(c) for c in sorted(keep)),
    ])


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    body_src, bold_src = argv[1], argv[2]
    for p in (body_src, bold_src):
        if not os.path.isfile(p):
            print("× 找不到文件：" + p)
            return 1

    os.makedirs(FONT_DIR, exist_ok=True)

    keep = gb2312_chars() | repo_chars()

    # 1) 正文：先备份全量（只备份一次，别把已裁过的子集再覆盖回去），再裁子集
    body_dst = os.path.join(FONT_DIR, BODY_NAME)
    if not os.path.isfile(BODY_FULL_BACKUP) and os.path.getsize(body_src) > 400 * 1024:
        os.makedirs(os.path.dirname(BODY_FULL_BACKUP), exist_ok=True)
        shutil.copyfile(body_src, BODY_FULL_BACKUP)
        print("√ 已备份全量正文体到 %s（gitignore 的本地备份，不进仓库）"
              % os.path.relpath(BODY_FULL_BACKUP, ROOT))
    subset_to(body_src, body_dst, keep)

    # 2) 标题：同一个子集字符集
    bold_dst = os.path.join(FONT_DIR, BOLD_NAME)
    subset_to(bold_src, bold_dst, keep)

    # 3) 许可证（OFL 要求随附，别删）
    for src, dst_name in ((body_src, "fusion-pixel-OFL.txt"), (bold_src, "fusion-bold-pixel-OFL.txt")):
        lic = os.path.join(os.path.dirname(src), "OFL.txt")
        if os.path.isfile(lic):
            shutil.copyfile(lic, os.path.join(FONT_DIR, dst_name))

    kb = lambda p: os.path.getsize(p) / 1024.0
    print("√ 正文 %s  %.0f KB（子集：GB2312 + 仓库实际用字 %d 个）" % (BODY_NAME, kb(body_dst), len(keep)))
    print("√ 标题 %s  %.0f KB（子集：同上）" % (BOLD_NAME, kb(bold_dst)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
