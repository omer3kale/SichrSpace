@echo off
echo 🏠 Starting SichrPlace Application...
echo.
cd /d "%~dp0backend"
echo 📂 Starting from: %CD%
echo.
node server.js
pause
