@echo off
rem Start the command-line preview on http://127.0.0.1:4010/
rem (the Hexo Pro Desktop client has its own preview on port 4000)
cd /d "%~dp0"
echo.
echo  Preview:  http://127.0.0.1:4010/
echo  Close this window (or press Ctrl+C) to stop the preview.
echo.
call npm run server
pause
