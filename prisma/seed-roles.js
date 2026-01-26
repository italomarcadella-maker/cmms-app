const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
        { email: 'admin@cmms.com', name: 'Admin User', role: 'ADMIN' },
        { email: 'supervisor@cmms.com', name: 'Supervisor User', role: 'SUPERVISOR' },
        { email: 'maintainer@cmms.com', name: 'Maintainer User', role: 'MAINTAINER' },
        { email: 'user@cmms.com', name: 'Standard User', role: 'USER' },
    ];

    for (const u of users) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { role: u.role }, // Ensure role is updated if exists
            create: {
                email: u.email,
                name: u.name,
                password: hashedPassword,
                role: u.role,
                mustChangePassword: false
            }
        });
        console.log(`User seeded: ${user.email} (${user.role})`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
