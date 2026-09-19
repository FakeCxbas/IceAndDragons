@echo off
cd /d "%~dp0"

start "" "C:\Program Files\playit_gg\bin\playit.exe"
start "" cmd /k java -Xms6G -Xmx6G -jar server_1.21.1.jar nogui

pause
