@echo off
rem Build and publish to GitHub Pages. Double-click to run.
rem Tip: close the Hexo Pro Desktop client first, so nothing fights over
rem      the public/ folder while this runs.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
echo.
echo ------------------------------------------------------------
echo  Done.  Open https://jawooth.github.io/ and press Ctrl+F5.
echo ------------------------------------------------------------
pause
