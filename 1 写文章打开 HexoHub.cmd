@echo off
chcp 65001 >nul
rem ============================================================
rem  Open HexoHub - the editor where you write posts, drag in
rem  images, and run clean/generate/deploy with buttons.
rem
rem  This only LAUNCHES the app. It does not touch the site.
rem  Remember to point HexoHub at this folder once:
rem      D:\tools\hexo
rem
rem  Keep this file pure ASCII (cmd.exe loses its place when a
rem  non-ASCII byte follows "chcp 65001").
rem ============================================================
cd /d "%~dp0"

set "HUB="
for /f "tokens=2,*" %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "HexoHub" 2^>nul ^| findstr /i "InstallLocation"') do (
  if exist "%%b\hexohub.exe" set "HUB=%%b\hexohub.exe"
)
if not defined HUB (
  for /f "tokens=2,*" %%a in ('reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "HexoHub" 2^>nul ^| findstr /i "InstallLocation"') do (
    if exist "%%b\hexohub.exe" set "HUB=%%b\hexohub.exe"
  )
)
if not defined HUB if exist "D:\tools\HexoHub\hexohub.exe" set "HUB=D:\tools\HexoHub\hexohub.exe"
if not defined HUB if exist "%LOCALAPPDATA%\Programs\HexoHub\hexohub.exe" set "HUB=%LOCALAPPDATA%\Programs\HexoHub\hexohub.exe"
if not defined HUB if exist "%ProgramFiles%\HexoHub\hexohub.exe" set "HUB=%ProgramFiles%\HexoHub\hexohub.exe"

if not defined HUB goto not_found

echo  Opening HexoHub...
start "" "%HUB%"
echo  If it asks for the blog folder, choose:  %~dp0
goto :eof

:not_found
echo.
echo  [X] HexoHub was not found on this computer.
echo      Looked in the registry and in the usual install folders.
echo.
echo      Install it from:
echo        https://github.com/forever218/HexoHub/releases
echo      or edit this file and set HUB= to your hexohub.exe path.
echo.
pause
