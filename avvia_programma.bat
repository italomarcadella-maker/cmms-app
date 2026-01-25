@echo off
echo Avvio CMMS in corso...
cd /d "%~dp0"

IF NOT EXIST "node_modules" (
    echo Installazione dipendenze...
    call npm.cmd install
)

echo Avvio server di sviluppo...
start http://localhost:3000
call npm.cmd run dev
pause
