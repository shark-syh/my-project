@echo off
chcp 65001 >nul
node "%~dp0..\scripts\manage-passwords.js" import "%~dp0new-users.txt" --reset
pause
