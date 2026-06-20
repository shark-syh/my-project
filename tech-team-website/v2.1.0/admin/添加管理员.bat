@echo off
chcp 65001 >nul
node "C:\Users\hw\Desktop\tech-team-website - for-shark\scripts\manage-passwords.js" import "C:\Users\hw\Desktop\tech-team-website - for-shark\admin\new-users.txt" --reset
pause
