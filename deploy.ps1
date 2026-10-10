# Hexo deploy: clean -> generate -> push to GitHub Pages.
#
# NOTE FOR MAINTAINERS: keep this file pure ASCII.
# It is launched through Windows PowerShell 5.1, which decodes a BOM-less UTF-8
# script as ANSI: any non-ASCII character turns into mojibake and the parser
# silently drops or mangles the following lines. That bug once made this script
# die right after `clean`, leaving public/ deleted and nothing deployed - which
# looks exactly like "I published but the site did not change".
# All user-facing Chinese lives in the calling .cmd file instead.
#
# Recommended use: double-click the publish script in the repo root (its name is
# Chinese, hence not written here). It stops a running preview server first,
# offers a retry, and pauses so you can read the result.
#
# Parameters:
#   -SkipBuild   do not clean/generate; only push what is already in public/.
#                Use this to retry an upload that failed on a flaky proxy.
#
# Direct use: powershell -ExecutionPolicy Bypass -File .\deploy.ps1 [-SkipBuild]

param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Continue"

if (-not $SkipBuild) {
  Write-Host "==> [1/3] hexo clean" -ForegroundColor Cyan
  npx hexo clean
  if ($LASTEXITCODE -ne 0) {
    Write-Host "!! clean failed - aborting." -ForegroundColor Red
    exit 1
  }

  Write-Host "==> [2/3] hexo generate" -ForegroundColor Cyan
  npx hexo generate
  if ($LASTEXITCODE -ne 0) {
    Write-Host "!! generate failed - nothing was deployed." -ForegroundColor Red
    Write-Host "   Try: py -3 tools\verify-site.py" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "==> [1/3] clean      SKIPPED (-SkipBuild)" -ForegroundColor DarkGray
  Write-Host "==> [2/3] generate   SKIPPED (-SkipBuild)" -ForegroundColor DarkGray
}

# The old twikoo/gitalk vendor files no longer exist in the theme, so the
# cleanup step that used to live here was removed (see MAINTENANCE.md 13.2).

Write-Host "==> [3/3] hexo deploy (git push)" -ForegroundColor Cyan
npx hexo deploy
if ($LASTEXITCODE -ne 0) {
  Write-Host "!! deploy failed (usually the local proxy or the network)." -ForegroundColor Red
  Write-Host "   The generated site is NOT lost - see MAINTENANCE.md section 12," -ForegroundColor Red
  Write-Host "   or run the publish script again and choose 'Retry upload'." -ForegroundColor Red
  exit 1
}

Write-Host "==> Done. Open https://Jawooth.github.io/ and press Ctrl+F5." -ForegroundColor Green
Write-Host "    GitHub Pages needs about 30-120 seconds to publish." -ForegroundColor Green
