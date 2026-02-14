@echo off
echo ========================================================
echo  Deploy ESTREMO (Risoluzione problemi file grandi)
echo ========================================================
echo.
echo ATTENZIONE: Questo comando resettara' la storia git locale per risolvere
echo il problema dei file troppo grandi (node_modules, .next) nel commit.
echo I tuoi file di progetto NON verranno toccati, solo la configurazione git.
echo.
pause
echo.
echo 1. Fermo eventuali processi git...
taskkill /F /IM git.exe >nul 2>&1

echo 2. Rimuovo la vecchia cartella .git (puo' richiedere qualche secondo)...
rmdir /S /Q .git
if exist .git (
    echo ERRORE: Non riesco a cancellare la cartella .git. Chiudi VS Code e riprova.
    pause
    exit /b
)

echo 3. Reinizializzo il repository...
git init
git branch -M main

echo 4. Aggiungo il remote origin...
git remote add origin https://github.com/italomarcadella-maker/cmms-app.git

echo 5. Aggiungo i file (ignorando node_modules e .next grazie a .gitignore)...
git add .

echo 6. Creo il commit iniziale pulito...
git commit -m "Deployment v1 (Clean)"

echo 7. Eseguo il push forzato...
echo (Inserisci le credenziali GitHub se richiesto)
git push -u origin main --force

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo  SUCCESSO! Il deploy dovrebbe partire ora.
) else (
    echo  ERRORE. Controlla i messaggi sopra.
)
echo ========================================================
pause
