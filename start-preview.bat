@echo off
echo Starting Maktaba App...
echo.
echo Opening browser at http://localhost:8080/preview.html
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "C:\Users\Ahmed\maktaba-app"
start http://localhost:8080/preview.html
python -m http.server 8080
pause
