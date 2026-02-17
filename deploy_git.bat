@echo off
echo ==========================================
echo   DEPLOY AUTOMATICO SU GITHUB
echo ==========================================
echo.
cd /d "c:\Users\WDAGUtilityAccount\Desktop\Progetto manutenzione\cmms_2.0"

echo 1. Controllo stato...
git status
echo.

echo 2. Aggiunta file modificati...
git add .
echo.

echo 3. Commit (se necessario)...
git commit -m "Auto-deploy: Aggiornamento pre-consegna"
echo.

echo 4. Push verso GitHub...
echo    (Se richiesto, inserisci le credenziali nella finestra che appare)
git push
echo.

echo ==========================================
echo   FINE. Controlla se ci sono errori sopra.
echo ==========================================
pause
