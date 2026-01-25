
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@cmms.it';
    const password = 'admin';

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log('User not found');
        return;
    }

    if (!user.password) {
        console.log('User has no password');
        return;
    }

    const match = await bcrypt.compare(password, user.password);
    console.log(`Login check for ${email} with password '${password}': ${match ? 'SUCCESS' : 'FAILED'}`);

    // Also try checking the hash directly just in case of rounds mismatch or something odd
    console.log('Stored hash:', user.password);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
