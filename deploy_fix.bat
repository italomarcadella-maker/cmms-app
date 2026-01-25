@echo off
echo === CORREZIONE DEFINITIVA (PULIZIA DIST) ===
echo.

echo 1. Rimuovo la cartella 'dist' da Git (se esiste)...
"C:\Program Files\Git\cmd\git.exe" rm -r --cached dist
"C:\Program Files\Git\cmd\git.exe" rm -r dist

echo.
echo 2. Aggiungo i file corretti...
"C:\Program Files\Git\cmd\git.exe" add .

echo.
echo 3. Salvo le modifiche...
"C:\Program Files\Git\cmd\git.exe" commit -m "Remove dist folder and fix __dirname" --allow-empty

echo.
echo 4. Invio al server...
"C:\Program Files\Git\cmd\git.exe" push

echo.
echo =============================
echo OPERAZIONE CONCLUSA.
echo Controlla Vercel ora!
echo =============================
pause
