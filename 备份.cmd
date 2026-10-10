@echo off
rem Back up posts + images + data into backup\<date_time>\ before deleting anything.
rem backup\ is git-ignored, so it is never committed or deployed.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\backup.ps1"
pause
