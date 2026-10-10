@echo off
chcp 65001 >nul
rem ============================================================
rem  Look at the site on this computer. Double-click this file.
rem
rem  There are two possible previews and you never have to
rem  remember which is which - this script finds it:
rem
rem    port 4000 running -> that is HexoHub's preview; just open it
rem    port 4010 running -> a preview from an earlier run; open it
rem    nothing running   -> start one here (port 4010) and open it
rem
rem  Keep this window open while you look: closing it (or Ctrl+C)
rem  stops the preview that this script started.
rem  Keep this file pure ASCII.
rem ============================================================
cd /d "%~dp0"

netstat -ano | findstr /R /C:":4000 " >nul 2>nul
if not errorlevel 1 (
  echo.
  echo  HexoHub preview found on port 4000.
  start "" "http://localhost:4000/"
  echo  Opened http://localhost:4000/   ^(served by HexoHub^)
  echo.
  echo  Nothing else is needed - you can close this window.
  goto :eof
)

netstat -ano | findstr /R /C:":4010 " >nul 2>nul
if not errorlevel 1 (
  echo.
  echo  A preview from an earlier run is already on port 4010.
  start "" "http://127.0.0.1:4010/"
  echo  Opened http://127.0.0.1:4010/
  goto :eof
)

echo.
echo  Nothing is running yet - starting a preview on port 4010...
echo.
echo  REMINDER: a preview shows whatever was last generated.
echo  If you just changed posts, images or source\_data, run the
echo  "regenerate" script (starts with 2) first, then come back.
echo.
start "" "http://127.0.0.1:4010/"
call npm run server
echo.
echo  Preview stopped.
pause
