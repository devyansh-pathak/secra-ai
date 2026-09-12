@echo off
title Secra AI - Hackathon Launcher
echo ========================================================
echo       STARTING SECRA AI FULL-STACK APPLICATION
echo ========================================================
echo [1/2] Launching Backend Server on http://127.0.0.1:8000
start "Secra AI - Backend Server" cmd /c "%~dp0run_backend.bat"

echo [2/2] Launching Frontend Dashboard on http://localhost:5173
start "Secra AI - Frontend Dashboard" cmd /c "%~dp0run_frontend.bat"

echo.
echo Both servers are starting up!
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo.
echo ========================================================
echo Secra AI is running! Press any key to close this window.
echo ========================================================
pause
