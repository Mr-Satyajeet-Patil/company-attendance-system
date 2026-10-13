@echo off
title PulseAttend 360 AI - Full Stack Dev Mode
echo ======================================================================
echo    PULSEATTEND 360 AI - FULL STACK DEV ENVIRONMENT
echo ======================================================================
echo.
echo Starting Django Backend in a new window...
start "PulseAttend Django API (Port 8000)" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && python manage.py runserver 8000"

echo Starting React Vite Dev Server with Hot-Reload (Port 5173)...
cd /d %~dp0\frontend
npm run dev
