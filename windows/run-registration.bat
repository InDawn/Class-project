@echo off
setlocal
cd /d "%~dp0\.."

set "IMAGE_PATH=C:\Users\user\Downloads\IMG_0019.jpeg"
set "REQUEST_COUNT=10"
set "START_NUMBER=1"
set "INTERVAL_SECONDS=5"

if not exist "%IMAGE_PATH%" (
  echo ERROR: Credential image was not found:
  echo %IMAGE_PATH%
  echo.
  echo Edit IMAGE_PATH near the top of windows\run-registration.bat if it moved.
  pause
  exit /b 1
)

if not exist "node_modules\playwright" (
  echo ERROR: The runner is not installed yet.
  echo Run windows\install.bat first.
  pause
  exit /b 1
)

echo Creating %REQUEST_COUNT% registration requests at %INTERVAL_SECONDS%-second intervals.
echo Image: %IMAGE_PATH%
echo Press Ctrl+C at any time to stop.
echo.

call npm run register:test-users -- --images "%IMAGE_PATH%" --count %REQUEST_COUNT% --start %START_NUMBER% --interval %INTERVAL_SECONDS% --headed
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo One or more registrations failed. See registration-results.json and error screenshots.
if "%RESULT%"=="0" echo All registration requests completed.
pause
exit /b %RESULT%
