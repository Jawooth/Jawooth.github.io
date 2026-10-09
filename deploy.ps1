# Hexo 一键部署脚本
# 用法: 在 PowerShell 中执行 .\deploy.ps1

Write-Host "==> 清除旧文件..." -ForegroundColor Cyan
npx hexo clean

Write-Host "==> 生成静态文件..." -ForegroundColor Cyan
npx hexo generate

# 说明：以前这里会删掉 public 下的 twikoo/gitalk 评论脚本。那两个文件（以及其它
# 从未被加载的厂商资源，共约 1.5 MB）已经从主题里删除，不再需要这一步。

Write-Host "==> 部署到 GitHub..." -ForegroundColor Cyan
npx hexo deploy

Write-Host "==> 部署完成! 访问 https://Jawooth.github.io 查看效果" -ForegroundColor Green
