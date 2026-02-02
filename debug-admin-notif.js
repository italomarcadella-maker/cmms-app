
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Target the ADMIN user who has logged in
    const user = await prisma.user.findFirst({
        where: {
            email: 'admin@cmms.it'
        }
    });

    if (!user) {
        console.error('Admin user not found!');
        return;
    }

    console.log('Targeting active user:', user.name, user.email, user.id);

    // Create Test Notification
    console.log('Creating test notification for ADMIN...');
    await prisma.notification.create({
        data: {
            userId: user.id,
            title: 'Notifica Admin',
            message: 'Questa è la notifica corretta per il tuo utente.',
            link: '/work-orders',
            read: false
        }
    });
    console.log('Test notification created.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
