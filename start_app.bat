@echo off
title PulseAttend 360 AI - Enterprise Attendance System
echo ======================================================================
echo    PULSEATTEND 360 AI - ENTERPRISE MULTI-ANGLE BIOMETRIC PLATFORM
echo ======================================================================
echo.
echo [1/2] Activating Python Virtual Environment...
cd /d %~dp0
call venv\Scripts\activate.bat

echo [2/2] Launching PulseAttend 360 Server on http://127.0.0.1:8000/ ...
echo.
echo App URL: http://127.0.0.1:8000/
echo Admin URL: http://127.0.0.1:8000/admin/
echo.
python manage.py runserver 0.0.0.0:8000
pause
