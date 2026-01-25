$ErrorActionPreference = "Stop"

$distDir = "dist"
$standaloneDir = ".next\standalone"
$staticDir = ".next\static"
$publicDir = "public"
$prismaDir = "prisma"

Write-Host "Creating distribution bundle in $distDir..."

# Clean and create dist directory
if (Test-Path $distDir) {
    Remove-Item -Path $distDir -Recurse -Force
}
New-Item -ItemType Directory -Path $distDir | Out-Null

# 1. Copy Standalone build
Write-Host "Copying standalone build..."
Copy-Item -Path "$standaloneDir\*" -Destination $distDir -Recurse

# 2. Copy Static assets (Next.js requires these manually copied for standalone)
Write-Host "Copying static assets..."
$destStatic = "$distDir\.next\static"
New-Item -ItemType Directory -Path "$distDir\.next" -Force | Out-Null
Copy-Item -Path $staticDir -Destination "$distDir\.next" -Recurse

# 3. Copy Public folder
Write-Host "Copying public assets..."
Copy-Item -Path $publicDir -Destination $distDir -Recurse

# 4. Copy Prisma folder (for schema/migrations)
Write-Host "Copying prisma configuration..."
Copy-Item -Path $prismaDir -Destination $distDir -Recurse

# 5. Create/Copy .env
Write-Host "Creating default .env..."
# Only copy minimal needed. Generates a fresh one or copy existing if useful.
# For distribution, usually better to provide a template.
"DATABASE_URL=`"file:./dev.db`"" | Out-File "$distDir\.env" -Encoding utf8
"AUTH_SECRET=`"replace_me_with_a_long_random_string`"" | Add-Content "$distDir\.env"
# Ensure we have a place for the db
# We don't copy the existing dev.db to avoid shipping test data unless requested.
# But for simplicity, we might want to run push.

Write-Host "Bundle created successfully in $distDir"
