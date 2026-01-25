@echo off
echo === CORREZIONE DEPLOYMENT (BATCH) ===
echo Eseguo i comandi manualmente...

echo 1. Aggiungo i file...
"C:\Program Files\Git\cmd\git.exe" add .

echo 2. Salvo le modifiche...
"C:\Program Files\Git\cmd\git.exe" commit -m "Fix file encoding (Manual Batch)"

echo 3. Invio al server (Attendi la fine)...
"C:\Program Files\Git\cmd\git.exe" push

echo =============================
echo TUTTO FATTO! Ora controlla Vercel.
echo =============================
pause
