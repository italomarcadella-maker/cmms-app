
Stop-Process -Name "git" -Force -ErrorAction SilentlyContinue
if (Test-Path .git\index.lock) { Remove-Item .git\index.lock -Force }

Write-Host "Cleaning git index..."
git rm -r --cached . 2>$null

Write-Host "Re-adding files (respecting .gitignore)..."
git add .

Write-Host "Amending commit..."
git commit --amend --no-edit

Write-Host "Done. Ready for push."
