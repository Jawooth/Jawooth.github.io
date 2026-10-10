@echo off
chcp 65001 >nul
rem ============================================================
rem  Rebuild source\_data\music-tracks.yml from the NetEase
rem  playlist id stored in source\_data\music.yml.
rem
rem  Double-click this file (no need to cd anywhere first).
rem  Before running: put the playlist id (digits only) into
rem      source\_data\music.yml  ->  netease_playlist
rem  After running : double-click the "regenerate" script in this
rem      folder (its name starts with "2 ") to rebuild the site.
rem
rem  NOTE FOR MAINTAINERS: keep this file pure ASCII. A Chinese
rem  filename inside the body, after "chcp 65001", desynchronises
rem  cmd.exe's line reader and every later line loses its first
rem  character (producing "'rrorlevel' is not recognized").
rem ============================================================
cd /d "%~dp0"

set PYEXE=py -3
%PYEXE% --version >nul 2>nul
if not errorlevel 1 goto run

set PYEXE=python
%PYEXE% --version >nul 2>nul
if not errorlevel 1 goto run

echo.
echo  [X] Python 3 was not found. Install it, then run this again.
echo      Note: on this PC "python" is a Microsoft Store stub;
echo      the real interpreter is reached with "py -3".
echo.
pause
exit /b 1

:run
echo  Using: %PYEXE%
echo.
%PYEXE% "%~dp0tools\fetch-netease.py"
echo.
echo ------------------------------------------------------------
if errorlevel 1 goto failed
echo  OK - the music track list was regenerated.
echo  Next: run the "regenerate" script (starts with 2) to rebuild the site.
echo ------------------------------------------------------------
pause
goto :eof

:failed
echo  FAILED - read the messages above.
echo  Common causes: no network / proxy not running / the playlist
echo  is private / every track is VIP-restricted.
echo  See CONTENT-GUIDE.md section 7.
echo ------------------------------------------------------------
pause
