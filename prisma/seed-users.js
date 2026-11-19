// Seed di SVILUPPO: crea utenti con password di prova. Non eseguirlo mai su un database reale.
if (process.env.ALLOW_DEV_SEED !== '1') {
    console.error('Seed di sviluppo con password di prova: per eseguirlo su un database di prova imposta ALLOW_DEV_SEED=1. Non usarlo in produzione.');
    process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('user123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {},
        create: {
            email: 'user@example.com',
            name: 'Standard User',
            password: hashedPassword,
            role: 'USER',
            mustChangePassword: false
        }
    });

    console.log('Standard user created/verified:', user.email);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
