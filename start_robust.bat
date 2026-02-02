@echo off
title CMMS 2.0 Launcher
echo ---------------------------------------------------
echo    Avvio di CMMS 2.0 - Modalita Robusta
echo ---------------------------------------------------
echo.

cd /d "%~dp0"

IF NOT EXIST "node_modules" (
    echo [ERRORE] Cartella node_modules non trovata!
    echo Esegui 'npm install' prima di avviare.
    pause
    exit /b 1
)

echo [INFO] Avvio del server Next.js direttamente...
echo.

:: Uccide eventuali processi Node.js rimasti appesi
echo [INFO] Chiusura vecchi processi Node.js...
taskkill /F /IM node.exe >nul 2>&1

:: Utilizza direttamente l'eseguibile di Next.js per evitare blocchi delle policy di PowerShell su npm
:: Forza la porta 3000 per allinearsi con la configurazione di NEXTAUTH_URL
start "" "http://localhost:3000"
call node_modules\.bin\next.cmd dev -p 3000

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRORE] Il server si e' arrestato con codice errore %ERRORLEVEL%.
    echo Controlla i log sopra per i dettagli.
    pause
)
