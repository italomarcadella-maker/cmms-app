const { execSync } = require('child_process');

async function checkAndPush() {
    console.log("Checking DB connection and pushing schema...");
    const maxRetries = 30;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Attempt ${i + 1}/${maxRetries}...`);
            const output = execSync('npx prisma db push', { stdio: 'pipe', encoding: 'utf-8', env: { ...process.env, PATH: 'C:\\Program Files\\nodejs;' + process.env.PATH } });
            console.log("Success!");
            console.log(output);
            process.exit(0);
        } catch (error) {
            const stderr = error.stderr || error.stdout || error.message;
            console.log(`Failed. Retrying in 10s... Error snippet: ${stderr.substring(0, 100).replace(/\n/g, " ")}`);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
    console.error("Max retries reached.");
    process.exit(1);
}

checkAndPush();
