import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Elenco utenti nel database:');
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });

        if (users.length === 0) {
            console.log('Nessun utente trovato.');
        } else {
            console.table(users);
        }
    } catch (error) {
        console.error('Errore durante la lettura degli utenti:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
