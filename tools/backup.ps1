# One-click backup: copy posts / images / data into backup\<date_time>\
# (backup\ is git-ignored, so it is never committed or deployed)
#
# NOTE FOR MAINTAINERS: keep this file pure ASCII.
# It is launched through Windows PowerShell 5.1, which decodes a BOM-less UTF-8
# script as ANSI: non-ASCII characters become mojibake, so Chinese output here
# would be unreadable. Everything below is English on purpose.
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

$root  = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$dest  = Join-Path $root ("backup\" + $stamp)
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$items = @(
  @{ rel = 'source\_posts';  name = '_posts' },
  @{ rel = 'source\images';  name = 'images' },
  @{ rel = 'source\_data';   name = '_data'  }
)

$missing = 0
foreach ($it in $items) {
  $src = Join-Path $root $it.rel
  if (Test-Path $src) {
    $target = Join-Path $dest $it.name
    Copy-Item -LiteralPath $src -Destination $target -Recurse -Force
    $n = (Get-ChildItem -LiteralPath $target -Recurse -File | Measure-Object).Count
    Write-Host ("  {0,-8} {1,3} files" -f $it.name, $n)
  } else {
    Write-Host ("  {0,-8} SKIPPED (not found)" -f $it.name)
    $missing++
  }
}

Write-Host ""
Write-Host ("  Backup written to: " + $dest)
Write-Host "  (backup\ is git-ignored: never committed, never deployed)"
if ($missing -gt 0) {
  Write-Host ("  !! {0} source folder(s) were missing - check the path." -f $missing) -ForegroundColor Yellow
}
