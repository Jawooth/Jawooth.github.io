# 一键备份：把文章 / 图片 / 数据文件复制到 backup\<日期_时间>\（backup\ 已被 git 忽略）
$root = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$dest = Join-Path $root ("backup\" + $stamp)
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$items = @(
  @{ rel = 'source\_posts';  name = '_posts' },
  @{ rel = 'source\images';  name = 'images' },
  @{ rel = 'source\_data';   name = '_data'  }
)
foreach ($it in $items) {
  $src = Join-Path $root $it.rel
  if (Test-Path $src) {
    $target = Join-Path $dest $it.name
    Copy-Item -LiteralPath $src -Destination $target -Recurse -Force
    $n = (Get-ChildItem -LiteralPath $target -Recurse -File | Measure-Object).Count
    Write-Host ("  {0,-8} {1,3} 个文件" -f $it.name, $n)
  }
}
Write-Host ""
Write-Host ("  已备份到: " + $dest)
Write-Host "  （backup\ 不会进 git，也不会被部署）"
