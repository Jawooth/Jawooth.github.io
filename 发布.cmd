@echo off
chcp 65001 >nul
rem ============================================================
rem  Publish to GitHub Pages: clean -^> generate -^> deploy.
rem  BEFORE running: close the HexoHub preview server, so nothing
rem  fights over the public\ folder.
rem  AFTER running: open https://jawooth.github.io/ and press Ctrl+F5.
rem  Troubleshooting: MAINTENANCE.md section 12.
rem ============================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
echo.
echo ------------------------------------------------------------
echo  Done.  Open https://jawooth.github.io/ and press Ctrl+F5.
echo  GitHub Pages needs ~30-120s to refresh after the upload.
echo ------------------------------------------------------------
pause
