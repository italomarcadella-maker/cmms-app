import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Inizio eliminazione di tutti i record dalla tabella Technician...');

    try {
        const { count } = await prisma.technician.deleteMany({});
        console.log(`Eliminati ${count} record dalla tabella Technician.`);
    } catch (error) {
        console.error('Errore durante svuotamento tabella Technician:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
