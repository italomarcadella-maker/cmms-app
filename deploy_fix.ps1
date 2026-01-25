Write-Host "=== CORREZIONE DEPLOYMENT ===" -ForegroundColor Cyan
Write-Host "Eseguo i comandi manualmente..."

# 1. Aggiunge tutti i file modificati
Write-Host "1. Aggiungo i file..."
& "C:\Program Files\Git\cmd\git.exe" add .

# 2. Crea il commit (se non c'è nulla da committare, non importa)
Write-Host "2. Salvo le modifiche..."
& "C:\Program Files\Git\cmd\git.exe" commit -m "Fix file encoding (Manual)"

# 3. Invia a GitHub
Write-Host "3. Invio al server (Attendi la fine)..."
& "C:\Program Files\Git\cmd\git.exe" push

Write-Host "=============================" -ForegroundColor Green
Write-Host "TUTTO FATTO! Ora controlla Vercel."
Write-Host "============================="
Read-Host "Premi INVIO per chiudere..."
