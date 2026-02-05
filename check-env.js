const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const hasDirect = content.includes('DIRECT_URL=');
        console.log("Has DIRECT_URL:", hasDirect);
    } else {
        console.log(".env file not found");
    }
} catch (e) {
    console.error("Error reading .env:", e);
}
