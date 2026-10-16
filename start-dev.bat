@echo off
echo ========================================
echo    Maktaba App - Development Server
echo ========================================
echo.
echo Starting backend server on port 3000...
echo Starting Expo dev server on port 8084...
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:8084
echo.
echo Press Ctrl+C to stop each server in its window
echo ========================================
echo.
cd /d "C:\Users\Ahmed\maktaba-app"
start "Backend Server (Port 3000)" cmd /k "node admin-server.js"
timeout /t 3 /nobreak >nul
start "Expo Dev Server (Port 8084)" cmd /k "npx expo start --web --port 8084"
echo.
echo Servers started!
echo Backend:  http://localhost:3000 (لوحة التحكم)
echo Frontend: http://localhost:8084 (التطبيق)
echo.
pause
