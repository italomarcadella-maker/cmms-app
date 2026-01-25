
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('User count:', users.length);
    users.forEach(u => {
        console.log(`User: ${u.email}, Role: ${u.role}, HasPassword: ${!!u.password}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
