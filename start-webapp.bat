@echo off
echo ========================================
echo     Investment Portfolio Manager
echo ========================================
echo.

REM Controlla se Node.js è installato
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRORE: Node.js non è installato sul sistema.
    echo Scarica Node.js da: https://nodejs.org/
    echo Premi un tasto per uscire...
    pause >nul
    exit /b 1
)

REM Controlla se npm è installato
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRORE: npm non è disponibile.
    echo Reinstalla Node.js da: https://nodejs.org/
    echo Premi un tasto per uscire...
    pause >nul
    exit /b 1
)

echo Node.js e npm sono installati correttamente.
echo.

REM Controlla se le dipendenze sono installate
if not exist "node_modules" (
    echo Installazione dipendenze in corso...
    echo Questo potrebbe richiedere alcuni minuti...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ERRORE: Installazione dipendenze fallita.
        echo Premi un tasto per uscire...
        pause >nul
        exit /b 1
    )
    echo Dipendenze installate con successo!
    echo.
) else (
    echo Dipendenze già installate.
    echo.
)

REM Controlla se il file .env esiste per la chiave API
if not exist ".env" (
    echo ATTENZIONE: File .env non trovato.
    echo Creazione file .env per la configurazione API...
    echo FINNHUB_API_KEY=inserisci_qui_la_tua_chiave_api > .env
    echo.
    echo IMPORTANTE: Modifica il file .env e inserisci la tua chiave API Finnhub.
    echo Puoi ottenere una chiave gratuita su: https://finnhub.io/
    echo.
)

echo Avvio dell'applicazione...
echo.
echo La webapp sarà disponibile su: http://localhost:5173
echo.
echo Per chiudere l'applicazione, premi Ctrl+C in questa finestra.
echo.

REM Avvia l'applicazione
npm run dev

REM Se l'applicazione si chiude, mostra un messaggio
echo.
echo L'applicazione è stata chiusa.
echo Premi un tasto per uscire...
pause >nul