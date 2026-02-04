
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking User/Technician Consistency ---');

    // 1. Check MAITAINERS without Technician profile
    const maintainers = await prisma.user.findMany({
        where: {
            role: 'MAINTAINER'
        },
        include: {
            technicianProfile: true
        }
    });

    const maintainersWithoutProfile = maintainers.filter(u => !u.technicianProfile);
    if (maintainersWithoutProfile.length > 0) {
        console.log(`\nFound ${maintainersWithoutProfile.length} MAINTAINERs without Technician profile:`);
        maintainersWithoutProfile.forEach(u => console.log(` - ${u.name} (${u.email})`));
    } else {
        console.log('\nAll MAINTAINER users have a Technician profile.');
    }

    // 2. Check Technician profiles
    const technicians = await prisma.technician.findMany({
        include: {
            user: true
        }
    });

    console.log(`\nTotal Technicians: ${technicians.length}`);
    technicians.forEach(t => {
        if (!t.user) { // Should not happen due to foreign key, but logic check
            console.log(` - Technician ${t.name} has no associated User! (ID: ${t.id})`);
        } else {
            console.log(` - Tech: ${t.name} -> User Role: ${t.user.role}`);
        }
    });

    // 3. Check for specific known users
    const allUsers = await prisma.user.findMany({ include: { technicianProfile: true } });
    console.log('\n--- All Users Summary ---');
    allUsers.forEach(u => {
        const hasProfile = !!u.technicianProfile;
        console.log(`User: ${u.email?.padEnd(30)} | Role: ${u.role.padEnd(10)} | HasTechProfile: ${hasProfile}`);

        // Logical check: If role is MAINTAINER, expecting profile.
        if (u.role === 'MAINTAINER' && !hasProfile) {
            console.warn(`  WARNING: Role is MAINTAINER but no profile!`);
        }
        // Logical check: If have profile, maybe should be MAINTAINER? (Not strictly required, ADMINs can have profiles too per seed)
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
