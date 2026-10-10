@echo off
chcp 65001 >nul
rem ============================================================
rem  Open HexoHub - the editor where you write posts, drag in
rem  images, and run clean/generate/deploy with buttons.
rem
rem  This only LAUNCHES the app. It does not touch the site.
rem  Point HexoHub at this folder once:  D:\tools\hexo
rem
rem  Lookup order: uninstall-registry record -> this folder's
rem  sibling install -> common install folders. If all fail, the
rem  error message tells you how to set the path yourself.
rem
rem  Keep this file pure ASCII (cmd.exe loses its place after
rem  "chcp 65001" if a non-ASCII byte follows).
rem ============================================================
cd /d "%~dp0"

set "HUB="

rem --- 1) ask the uninstall registry record where it was installed.
rem The record holds DisplayIcon = "<dir>\hexohub.exe" (quoted), which is
rem easier to parse than InstallLocation: the quotes let us take everything
rem from the first quote to the last one even when the path has spaces.
set "REGAPP="
for /f "tokens=2,*" %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "HexoHub" 2^>nul ^| findstr /i "DisplayIcon"') do (
  if exist %%b set "REGAPP=%%b"
)
if not defined REGAPP (
  for /f "tokens=2,*" %%a in ('reg query "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "HexoHub" 2^>nul ^| findstr /i "DisplayIcon"') do (
    if exist %%b set "REGAPP=%%b"
  )
)
if defined REGAPP set "HUB=%REGAPP%"

rem --- 2) typical locations, including one next to this blog folder.
if not defined HUB if exist "D:\tools\HexoHub\hexohub.exe"                set "HUB=D:\tools\HexoHub\hexohub.exe"
if not defined HUB if exist "%~dp0..\HexoHub\hexohub.exe"                 set "HUB=%~dp0..\HexoHub\hexohub.exe"
if not defined HUB if exist "%LOCALAPPDATA%\Programs\HexoHub\hexohub.exe" set "HUB=%LOCALAPPDATA%\Programs\HexoHub\hexohub.exe"
if not defined HUB if exist "%ProgramFiles%\HexoHub\hexohub.exe"          set "HUB=%ProgramFiles%\HexoHub\hexohub.exe"

if not defined HUB goto not_found

echo  Opening HexoHub:
echo     %HUB%
start "" "%HUB%"
echo.
echo  If it asks for the blog folder, choose:  %~dp0
timeout /t 2 /nobreak >nul
goto :eof

:not_found
echo.
echo  [X] HexoHub was not found on this computer.
echo.
echo      Looked in the uninstall records and in these folders:
echo        D:\tools\HexoHub
echo        %~dp0..\HexoHub
echo        %LOCALAPPDATA%\Programs\HexoHub
echo        %ProgramFiles%\HexoHub
echo.
echo      Either install it from:
echo        https://github.com/forever218/HexoHub/releases
echo      or open this file in Notepad and add one line like:
echo        set "HUB=D:\wherever\hexohub.exe"
echo      just above the "if not defined HUB goto not_found" line.
echo.
pause
