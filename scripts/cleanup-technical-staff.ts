import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Inizio pulizia staff tecnico...');

    try {
        // Find users to delete
        const usersToDelete = await prisma.user.findMany({
            where: {
                role: {
                    in: ['MAINTAINER', 'TECHNICIAN']
                }
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });

        console.log(`Trovati ${usersToDelete.length} utenti da eliminare.`);

        if (usersToDelete.length === 0) {
            console.log('Nessun utente tecnico trovato.');
            return;
        }

        for (const user of usersToDelete) {
            console.log(`Eliminazione utente: ${user.name} (${user.email}) - Ruolo: ${user.role}`);
            await prisma.user.delete({
                where: { id: user.id }
            });
        }

        console.log('Pulizia completata con successo.');

    } catch (error) {
        console.error('Errore durante la pulizia:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
