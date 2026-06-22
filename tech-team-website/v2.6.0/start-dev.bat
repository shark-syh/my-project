@echo off
cd /d "%~dp0"
echo 正在启动贵阳二中科技先锋队网站开发服务器...
echo.
start http://localhost:4002
npx hexo server --port 4002
pause
