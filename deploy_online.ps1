Write-Host "=== AVVIO PROCEDURA DI CARICAMENTO ===" -ForegroundColor Green
Write-Host "Sto preparando i file..."

& "C:\Program Files\Git\cmd\git.exe" add .

Write-Host "Salvataggio modifiche (Fix Encoding)..."
& "C:\Program Files\Git\cmd\git.exe" commit -m "Fix file encoding (UTF-8)"

Write-Host "Invio a GitHub (Vercel partirà dopo questo passaggio)..."
& "C:\Program Files\Git\cmd\git.exe" push

Write-Host "=== OPERAZIONE COMPLETATA ===" -ForegroundColor Green
Write-Host "Controlla la dashboard di Vercel!"
Read-Host "Premi INVIO per chiudere questa finestra..."
