@echo off
title Secra AI - Backend Server
echo ===================================================
echo        SECRA AI - FASTAPI BACKEND SERVER
echo ===================================================
cd /d "%~dp0\backend"
echo Initializing database and starting server on port 8000...
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
