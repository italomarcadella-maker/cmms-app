const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // 1. Create a Technician record (Standard Profile)
    // We check if it exists first to avoid duplicates or errors
    let tech = await prisma.technician.findFirst({
        where: { name: 'Mario Rossi' }
    });

    if (!tech) {
        tech = await prisma.technician.create({
            data: {
                name: 'Mario Rossi',
                specialty: 'Meccanico Generale',
                hourlyRate: 35.0
            }
        });
        console.log('Technician profile created:', tech.name);
    }

    // 2. Create the User Login linked to this technician (conceptually)
    // The link is usually via name or ID. Current system uses name matching in "My Tasks"
    const hashedPassword = await bcrypt.hash('tech123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'mario.rossi@example.com' },
        update: {
            role: 'TECHNICIAN' // Ensure role is updated if exists
        },
        create: {
            email: 'mario.rossi@example.com',
            name: 'Mario Rossi', // Matches Technician Name
            password: hashedPassword,
            role: 'TECHNICIAN',
            mustChangePassword: false
        }
    });

    console.log('Maintainer user created:', user.email);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
