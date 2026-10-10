@echo off
chcp 65001 >nul
rem ============================================================
rem  Local preview on http://127.0.0.1:4010/
rem  Double-click this file, then open the URL in a browser.
rem  Close this window (or press Ctrl+C) to stop it.
rem  Do NOT run this while the HexoHub preview (port 4000) is on.
rem ============================================================
cd /d "%~dp0"
echo.
echo  Preview:  http://127.0.0.1:4010/
echo  Stop it:  close this window, or press Ctrl+C
echo.
call npm run server
pause
