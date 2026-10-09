@echo off
rem Build the site (clean + generate). Double-click to run.
cd /d "%~dp0"
call npm run build
echo.
echo ------------------------------------------------------------
echo  Build finished.  (See the Chinese notes in MAINTENANCE.md)
echo  If you preview inside Hexo Pro Desktop, refresh / rebuild
echo  that project too, otherwise it keeps showing its own cache.
echo ------------------------------------------------------------
pause
