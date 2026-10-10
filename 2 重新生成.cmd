@echo off
chcp 65001 >nul
rem ============================================================
rem  Regenerate the site after you changed something.
rem  (This is "hexo clean + hexo generate".)
rem
rem  WHAT THIS IS FOR
rem    After editing posts / images / the files in source\_data,
rem    run this once. Without it the change is not in public\, so
rem    neither the preview nor a deploy will show it.
rem    Editing CSS only? Just refresh the browser - no need for this.
rem
rem  WHY THERE IS A PORT CHECK
rem    hexo clean deletes public\. If the HexoHub preview server is
rem    running, it kills our node process halfway and you are left
rem    with a half-built site and no clear error - which looks like
rem    "I published but nothing changed". So we stop it first.
rem
rem  Keep this file pure ASCII (cmd.exe loses its place after
rem  "chcp 65001" if a non-ASCII byte follows).
rem ============================================================
cd /d "%~dp0"

netstat -ano | findstr /R /C:":4000 " >nul 2>nul
if not errorlevel 1 goto port_busy

call :do_build
goto :eof

:port_busy
echo.
echo  [!] Port 4000 is in use - the HexoHub preview server is running.
echo      It would kill this build halfway, leaving public\ incomplete.
echo      (Harmless here, but this is why builds sometimes "do nothing".)
echo.
set /p "ANS=  Stop that preview and continue? [Y/N] "
if /i not "%ANS%"=="Y" goto aborted
echo.
echo  Stopping the process on port 4000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":4000 "') do (
  taskkill /f /pid %%p >nul 2>nul
)
timeout /t 1 /nobreak >nul
echo  Done. Continuing.
echo.

call :do_build
goto :eof

:aborted
echo.
echo  Cancelled. Close the HexoHub preview server first, then run this again.
echo.
pause
goto :eof

:do_build
call npm run build
echo.
echo ------------------------------------------------------------
if errorlevel 1 goto build_failed
echo  OK - the site was rebuilt into public\
echo  To look at it now: run the "look at it" script (starts with 3).
echo  To put it online:  run the publish script (starts with 4).
echo ------------------------------------------------------------
pause
goto :eof

:build_failed
echo  FAILED - read the messages above, then see MAINTENANCE.md
echo  section 8 ^(known pitfalls^), or ask an AI assistant.
echo ------------------------------------------------------------
pause
