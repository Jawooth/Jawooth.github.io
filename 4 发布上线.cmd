@echo off
chcp 65001 >nul
rem ============================================================
rem  Put the site online (GitHub Pages).
rem  Steps: clean -> generate -> push to gh-pages.
rem
rem  BEFORE RUNNING: the HexoHub preview server must be off.
rem  It kills whatever holds port 4000, and hexo clean deletes
rem  public\ - so publishing with the preview running can abort
rem  the build halfway, which looks exactly like
rem  "I published but nothing changed". This script checks and
rem  offers to stop it for you.
rem
rem  AFTER RUNNING: the window either says Done (all good) or
rem  FAILED with the failing step called out.
rem  GitHub Pages then needs 30-120 seconds. Open
rem  https://jawooth.github.io/ and press Ctrl+F5.
rem
rem  IF IT FAILED WITH "TLS connect error" / "unable to access":
rem  that is the local proxy (Clash Verge on 127.0.0.1:7897) being
rem  flaky, NOT a problem with your content - the site was already
rem  generated. Run this script again and choose [1] Retry upload.
rem
rem  Keep this file pure ASCII (see MAINTENANCE.md, pitfall 20).
rem ============================================================
cd /d "%~dp0"

netstat -ano | findstr /R /C:":4000 " >nul 2>nul
if not errorlevel 1 goto port_busy
goto menu

:port_busy
echo.
echo  [!] Port 4000 is in use - the HexoHub preview server is running.
echo      It would kill this build halfway, leaving public\ incomplete,
echo      which looks like "I published but nothing changed".
echo.
set /p "ANS=  Stop it and continue? [Y/N] "
if /i not "%ANS%"=="Y" goto aborted
echo.
echo  Stopping the process on port 4000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":4000 "') do (
  taskkill /f /pid %%p >nul 2>nul
)
timeout /t 1 /nobreak >nul
echo  Done.
echo.

:menu
echo ============================================================
echo   How do you want to publish?
echo.
echo     [1]  Retry upload only      - fastest. Use this when the last
echo          attempt failed at the upload step (proxy/TLS error) and
echo          you have not changed any content since.
echo     [2]  Rebuild and upload     - the normal choice.
echo     [3]  Cancel
echo ============================================================
set "CHOICE="
set /p "CHOICE=  Type 1, 2 or 3 and press Enter: "
if "%CHOICE%"=="1" goto upload_only
if "%CHOICE%"=="2" goto full_build
if "%CHOICE%"=="3" goto aborted
echo.
echo  Please type 1, 2 or 3.
echo.
goto menu

:upload_only
echo.
echo  == Uploading the site that is already generated ==
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -SkipBuild
set DEPLOY_RC=%ERRORLEVEL%
goto report

:full_build
echo.
echo  == Full publish: clean, generate, upload ==
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
set DEPLOY_RC=%ERRORLEVEL%
goto report

:report
echo.
echo ------------------------------------------------------------
if not "%DEPLOY_RC%"=="0" goto deploy_failed
echo  Done.  Open https://jawooth.github.io/ and press Ctrl+F5.
echo  GitHub Pages needs about 30-120 seconds to refresh.
echo.
echo  Want proof it really uploaded? Run this in PowerShell:
echo      git -C "%~dp0.deploy_git" log -1
echo  and look for a fresh "Site updated: ..." line.
echo ------------------------------------------------------------
pause
goto :eof

:deploy_failed
echo  FAILED ^(exit code %DEPLOY_RC%^) - see the messages above.
echo.
echo  "TLS connect error" or "unable to access" means the local proxy
echo  dropped the upload. Nothing is lost: run this script again and
echo  choose [1] Retry upload. See MAINTENANCE.md section 12.
echo ------------------------------------------------------------
pause
goto :eof

:aborted
echo.
echo  Cancelled - nothing was changed.
echo.
pause
