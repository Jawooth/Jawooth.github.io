# Hexo 一键部署脚本（清理 -> 生成 -> 上传到 GitHub Pages）
#
# 推荐用法：双击仓库根目录的「发布.cmd」，它会调用本脚本并在结束前停住等你查看。
# 直接在 PowerShell 里跑： .\deploy.ps1
#
# 注意：跑之前先停掉 HexoHub 的预览服务器，避免两边同时操作 public/。
# 卡在 "Writing objects: 100%" 时的处理办法见 MAINTENANCE.md 第 12 节。

$ErrorActionPreference = "Continue"

Write-Host "==> 清除旧文件..." -ForegroundColor Cyan
npx hexo clean
if ($LASTEXITCODE -ne 0) { Write-Host "!! clean 失败，已中止。" -ForegroundColor Red; exit 1 }

Write-Host "==> 生成静态文件..." -ForegroundColor Cyan
npx hexo generate
if ($LASTEXITCODE -ne 0) { Write-Host "!! generate 失败，未部署。请看上面的报错，或运行 py -3 tools\verify-site.py" -ForegroundColor Red; exit 1 }

# 说明：以前这里会删掉 public 下的 twikoo/gitalk 评论脚本。那两个文件（以及其它
# 从未被加载的厂商资源，共约 1.5 MB）已经从主题里删除，不再需要这一步。

Write-Host "==> 部署到 GitHub..." -ForegroundColor Cyan
npx hexo deploy
if ($LASTEXITCODE -ne 0) { Write-Host "!! 部署失败（多半是网络/代理问题）。已生成的文件不会丢，见 MAINTENANCE.md 第 12 节。" -ForegroundColor Red; exit 1 }

Write-Host "==> 部署完成！" -ForegroundColor Green
Write-Host "    打开 https://Jawooth.github.io/ 并按 Ctrl+F5 强制刷新（GitHub 约需 30-120 秒生效）。" -ForegroundColor Green
