@echo off
echo Starting CMMS Application...

REM Check if Node is installed
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js LTS (v18+).
    pause
    exit /b 1
)

REM Initialize Database if it doesn't exist
IF NOT EXIST "prisma\dev.db" (
    echo Database file not found. Initializing database...
    REM We need to use npx or run the migrations. 
    REM Standalone builds typically have node_modules for production.
    REM But prisma CLI might be in devDependencies.
    REM Check if we can run migration from the potentially pruned node_modules.
    
    echo NOTE: Running initial database setup requires 'npx'. 
    echo If this fails, ensure you have internet access or the prisma CLI installed globally.
    call npx prisma db push
)

set PORT=3000
set HOSTNAME=0.0.0.0

echo Server running at http://localhost:3000
node server.js
