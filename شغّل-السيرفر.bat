@echo off
chcp 65001 >nul
title المكتبة - تشغيل السيرفر
cd /d "C:\Users\Ahmed\maktaba-app"

node start-all.js

echo.
echo (لو النافذة قفلت، اضغط أي زرار للخروج)
pause >nul
