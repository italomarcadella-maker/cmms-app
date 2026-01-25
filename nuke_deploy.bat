@echo off
echo === NUCLEAR DEPLOYMENT (PULIZIA TOTALE) ===
echo.

echo 1. Rimuovo DEFINITIVAMENTE la cartella 'dist' (causa errore __dirname)...
if exist "dist" rmdir /s /q "dist"
"C:\Program Files\Git\cmd\git.exe" rm -r --cached dist 2>nul


echo.
echo 3. Aggiungo TUTTO il resto...
"C:\Program Files\Git\cmd\git.exe" add .

echo.
echo 4. Creo il pacchetto di salvataggio...
"C:\Program Files\Git\cmd\git.exe" commit -m "NUCLEAR CLEAN: Remove dist and middleware" --allow-empty

echo.
echo 5. SPEDISCO A VERCEL...
"C:\Program Files\Git\cmd\git.exe" push

echo.
echo ==========================================
echo OPERAZIONE COMPLETA. 
echo Vai su Vercel e attendi il semaforo verde.
echo Poi controlla: https://cmms-app-eosin.vercel.app/api/debug
echo ==========================================
pause
