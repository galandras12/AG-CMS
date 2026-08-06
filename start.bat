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
  echo [FONTOS] Az elso inditas elott ki kell tolteni az ENCRYPTION_KEY erteket a .env fajlban.
  echo Uj kulcs generalasahoz futtasd ezt a parancsot:
  echo.
  echo    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  echo.
  echo Masold be a kapott erteket a .env fajl "ENCRYPTION_KEY=" sora utan
  echo ^(pl. ENCRYPTION_KEY=a1b2c3...^), mentsd el a fajlt, majd inditsd ujra ezt a start.bat-ot.
  echo.
  pause
  exit /b 0
)

findstr /X /C:"ENCRYPTION_KEY=" ".env" >nul
if not errorlevel 1 (
  echo [FIGYELMEZTETES] Az ENCRYPTION_KEY meg nincs kitoltve a .env fajlban.
  echo Generalj egy kulcsot ezzel a paranccsal:
  echo.
  echo    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  echo.
  echo Majd told ki a .env fajl "ENCRYPTION_KEY=" sorat, mentsd el, es inditsd ujra ezt a fajlt.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] node_modules mappa nem talalhato, fuggosegek telepitese ^(npm install^)...
  call npm install
  if errorlevel 1 (
    echo [HIBA] Az "npm install" nem sikerult, nezd at a fenti hibauzenetet.
    pause
    exit /b 1
  )
  echo.
)

echo ------------------------------------------------------------
echo Konfiguracio:
echo   - Szerver beallitasok (port, kulcsok, CORS): .env fajl
echo   - Backend URL a frontend szamara:            config\connection.json
echo   - Verzio:                                     config\version.json
echo ------------------------------------------------------------
echo.
echo [INFO] AG-CMS szerver inditasa... (leallitas: Ctrl+C)
echo.

call npm start

echo.
echo A szerver leallt.
pause
