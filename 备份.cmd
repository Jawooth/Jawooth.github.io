@echo off
rem Copy posts and images into backup\YYYY-MM-DD_HHMM\ so nothing is ever
rem really lost.  backup\ is in .gitignore, so it is never committed or deployed.
cd /d "%~dp0"
set STAMP=%DATE:~0,4%-%DATE:~5,2%-%DATE:~8,2%_%TIME:~0,2%%TIME:~3,2%
set STAMP=%STAMP: =0%
set DEST=backup\%STAMP%
echo.
echo  Backing up to:  %DEST%
mkdir "%DEST%" 2>nul
xcopy "source\_posts" "%DEST%\_posts\" /E /I /Q /Y >nul
xcopy "source\images" "%DEST%\images\" /E /I /Q /Y >nul
xcopy "source\_data" "%DEST%\_data\" /E /I /Q /Y >nul
echo  Done.  (posts + images + _data)
echo.
echo  Tip: backup\ is git-ignored, so it will not be committed or deployed.
pause
