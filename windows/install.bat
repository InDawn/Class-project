@echo off
setlocal
cd /d "%~dp0\.."

echo Installing the registration runner...
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install the LTS version from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

call npm install
if errorlevel 1 goto :failed
call npx playwright install chromium
if errorlevel 1 goto :failed

echo.
echo Installation complete. Double-click windows\run-registration.bat to start.
pause
exit /b 0

:failed
echo.
echo Installation failed. Check the messages above and your internet connection.
pause
exit /b 1
