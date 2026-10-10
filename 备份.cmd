@echo off
chcp 65001 >nul
rem ============================================================
rem  Back up posts + images + data into backup\<date_time>\
rem  Run this BEFORE deleting or replacing anything.
rem  backup\ is git-ignored: never committed, never deployed.
rem ============================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\backup.ps1"
pause
