@echo off
echo ==========================================
echo  Deploy Manuale FINALE (Fix Branch)
echo ==========================================
echo.
echo Controllo lo stato del repository...
git status

echo.
echo Rinomino il branch corrente in 'main'...
git branch -M main

echo.
echo Tentativo di commit (se mancante)...
git config user.email "deploy@cmms.local"
git config user.name "CMMS Deploy Bot"
git add .
git commit -m "Deployment v1 (Fresh & Clean)"

echo.
echo Avvio del PUSH su GitHub...
echo Premi un tasto e inserisci le credenziali se richieste.
pause

git push -u origin main --force

echo.
echo ==========================================
if %ERRORLEVEL% EQU 0 (
    echo  SUCCESSO! Deploy avviato.
) else (
    echo  ERRORE. Controlla i messaggi sopra.
)
echo ==========================================
pause
