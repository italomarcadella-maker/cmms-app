@echo off
echo ==========================================
echo  Deploy Manuale su GitHub/Vercel
echo ==========================================
echo.
echo Sto eseguendo il push forzato sul branch main...
echo Se richiesto, inserisci le credenziali di GitHub nella finestra che appare.
echo.
git push origin main --force
echo.
echo ==========================================
if %ERRORLEVEL% EQU 0 (
    echo  Successo! Il codice e' stato inviato.
    echo  Vercel dovrebbe iniziare il deploy a breve.
) else (
    echo  Errore durante il push. Controlla i messaggi sopra.
)
echo ==========================================
pause
