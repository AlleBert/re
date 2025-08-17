@echo off
echo ========================================
echo   Investment Portfolio Manager
echo ========================================
echo.
echo Avvio dell'applicazione...
echo.

REM Controlla se Node.js è installato
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERRORE: Node.js non è installato!
    echo Installa Node.js da https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Controlla se le dipendenze sono installate
if not exist "node_modules" (
    echo Installazione dipendenze...
    echo Questo potrebbe richiedere alcuni minuti...
    echo.
    npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo ERRORE: Installazione fallita!
        echo Controlla la connessione internet e riprova.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Avvio del server...
echo.
echo ========================================
echo   L'applicazione sarà disponibile su:
echo   http://localhost:5000
echo ========================================
echo.
echo Premi Ctrl+C per fermare il server
echo.

npm run dev