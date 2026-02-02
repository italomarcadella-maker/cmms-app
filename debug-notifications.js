
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Searching for "Mario Rossi"...');

    // Try to find the user
    const users = await prisma.user.findMany({
        where: {
            name: { contains: 'Mario', mode: 'insensitive' }
        }
    });

    console.log('Found users:', users);

    if (users.length === 0) {
        console.log('No user found matching "Mario". Listing all users:');
        const allUsers = await prisma.user.findMany();
        console.log(allUsers.map(u => ({ id: u.id, name: u.name, email: u.email })));
        return;
    }

    const targetUser = users.find(u => u.name.includes('Rossi')) || users[0];
    console.log('Targeting user:', targetUser.name, targetUser.id);

    // Check Notifications
    const notifications = await prisma.notification.findMany({
        where: { userId: targetUser.id }
    });
    console.log(`Found ${notifications.length} notifications for user.`);
    console.log(notifications);

    // Check Work Orders
    const wos = await prisma.workOrder.findMany({
        where: { assignedTo: targetUser.name }
    });
    console.log(`Found ${wos.length} Work Orders assigned to "${targetUser.name}".`);

    // Create Test Notification
    console.log('Creating test notification...');
    await prisma.notification.create({
        data: {
            userId: targetUser.id,
            title: 'Notifica di Test',
            message: 'Questa è una notifica di prova generata dal debug.',
            link: '/work-orders',
            read: false
        }
    });
    console.log('Test notification created.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
