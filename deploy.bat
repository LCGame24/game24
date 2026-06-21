@echo off
cd /d C:\Users\lcham\game24
echo.
echo ===================================
echo   Game24 - Deploying to Vercel
echo ===================================
echo.
git add .
set /p msg="Enter a short commit message (or press Enter for default): "
if "%msg%"=="" set msg=Update App.js
git commit -m "%msg%"
git push
echo.
echo ===================================
echo   Done! Vercel will auto-deploy in ~30 seconds.
echo   Check: https://vercel.com/dashboard
echo ===================================
pause