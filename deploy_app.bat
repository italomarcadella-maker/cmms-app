@echo off
REM Script di deploy automatico per CMMS App
REM Risolve problemi di timeout con file grandi e semplifica il processo

echo ==========================================
echo    CMMS App Deployment Script
echo ==========================================
echo.

REM Aumenta il buffer per evitare timeout "remote end hung up unexpectedly"
echo Configurando buffer di Git per upload grandi...
git config --global http.postBuffer 524288000
git config --global http.maxRequestBuffer 524288000

echo.
echo 1. Aggiungendo tutti i file modificati...
git add .

echo.
echo 2. Richiesta messaggio di commit...
set /p commit_msg="Inserisci messaggio di commit (Default: 'Update'): "
if "%commit_msg%"=="" set commit_msg=Update

echo.
echo Eseguendo commit: "%commit_msg%"
git commit -m "%commit_msg%"

echo.
echo 3. Tentativo di push su origin main...
echo    (Questo potrebbe richiedere tempo se ci sono molti file)
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERRORE] Il push e fallito!
    echo Possibili cause:
    echo - Connessione instabile
    echo - File troppo grandi
    echo - Modifiche remote non sincronizzate (prova 'git pull --rebase' manualmente)
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo    DEPLOY COMPLETATO CON SUCCESSO!
echo    Codice inviato a GitHub. Vercel avviera il build.
echo ==========================================
echo.
pause
