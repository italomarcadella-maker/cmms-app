const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env file manually for local builds if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

// Fallback DIRECT_URL to DATABASE_URL if not configured in environment
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
}

try {
    console.log('Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('Deploying database migrations...');
    if (process.env.DATABASE_URL) {
        try {
            execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        } catch (migrationError) {
            console.warn('⚠️ Warning: Database migration deployment failed.');
            console.warn('This might be due to legacy SQLite migrations mismatching the current PostgreSQL provider.');
            console.warn('You can sync the database schema manually using "npx prisma db push".');
            console.warn('Proceeding with the application build...');
        }
    } else {
        console.log('Skipping migrations: DATABASE_URL not set.');
    }

    console.log('Building Next.js application...');
    execSync('next build --webpack', { stdio: 'inherit' });
} catch (error) {
    console.error('Build step failed:', error);
    process.exit(1);
}
