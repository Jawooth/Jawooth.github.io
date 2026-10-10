@echo off
chcp 65001 >nul
rem ============================================================
rem  Build the site (hexo clean + hexo generate).
rem  Double-click this file.  Details: README.md (Chinese).
rem  Close the HexoHub preview server before building.
rem ============================================================
cd /d "%~dp0"
call npm run build
echo.
echo ------------------------------------------------------------
if errorlevel 1 goto build_failed
echo  OK - the site was generated into public\
echo  Preview: HexoHub ^(port 4000^) or 4010 via preview.cmd
echo ------------------------------------------------------------
pause
goto :eof

:build_failed
echo  FAILED - read the messages above, then see MAINTENANCE.md
echo  section 8 ^(known pitfalls^), or ask an AI assistant.
echo ------------------------------------------------------------
pause
