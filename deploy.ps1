# Hexo 一键部署脚本
# 用法: 在 PowerShell 中执行 .\deploy.ps1

Write-Host "==> 清除旧文件..." -ForegroundColor Cyan
npx hexo clean

Write-Host "==> 生成静态文件..." -ForegroundColor Cyan
npx hexo generate

Write-Host "==> 清理敏感文件..." -ForegroundColor Yellow
Remove-Item "public\js\twikoo.min.js" -ErrorAction SilentlyContinue
Remove-Item "public\js\gitalk.min.js" -ErrorAction SilentlyContinue

Write-Host "==> 部署到 GitHub..." -ForegroundColor Cyan
npx hexo deploy

Write-Host "==> 部署完成! 访问 https://Jawooth.github.io 查看效果" -ForegroundColor Green
