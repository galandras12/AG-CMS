@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   AG-CMS szerver inditasa
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [HIBA] Nem talalhato a Node.js.
  echo Toltsd le es telepitsd innen: https://nodejs.org/
  echo Telepites utan inditsd ujra ezt a fajlt.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [INFO] Nem talalhato .env fajl, letrehozom a .env.example alapjan...
  copy /Y ".env.example" ".env" >nul
  echo.
  echo [FONTOS] Az elso inditas elott ki kell tolteni a .env fajlban:
  echo   ENCRYPTION_KEY, JWT_SECRET, COOKIE_SECRET
  echo.
  echo Ertekek generalasahoz futtasd:
  echo    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  echo.
  echo Masold be a kapott ertekeket a megfelelo sorok utan, mentsd el a
  echo .env fajlt, majd inditsd ujra ezt a start.bat-ot.
  echo.
  pause
  exit /b 0
)

call :checkkey "ENCRYPTION_KEY"
if errorlevel 1 exit /b 1
call :checkkey "JWT_SECRET"
if errorlevel 1 exit /b 1
call :checkkey "COOKIE_SECRET"
if errorlevel 1 exit /b 1

echo [INFO] Fuggosegek ellenorzese/telepitese (npm install)...
call npm install
if errorlevel 1 (
  echo [HIBA] Az "npm install" nem sikerult, nezd at a fenti hibauzenetet.
  pause
  exit /b 1
)
echo.

echo ------------------------------------------------------------
echo Konfiguracio:
echo   - Szerver beallitasok (port, kulcsok, CORS): .env fajl
echo   - Backend URL a frontend szamara:            config\connection.json
echo   - Verzio:                                     config\version.json
echo   - Admin felulet:                              http://localhost:4000/admin/
echo ------------------------------------------------------------
echo.
echo [INFO] AG-CMS szerver inditasa... (leallitas: Ctrl+C)
echo.

call npm start

echo.
echo A szerver leallt.
pause
exit /b 0

:checkkey
findstr /X /C:"%~1=" ".env" >nul
if not errorlevel 1 (
  echo [FIGYELMEZTETES] A %~1 meg nincs kitoltve a .env fajlban.
  echo Generalj egy erteket ezzel a paranccsal:
  echo    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  echo Majd told ki a .env fajlban a "%~1=" sort, mentsd el, es inditsd ujra ezt a fajlt.
  echo.
  pause
  exit /b 1
)
exit /b 0
