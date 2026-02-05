import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Elenco tecnici nel database:');
    try {
        const techs = await prisma.technician.findMany();

        if (techs.length === 0) {
            console.log('Nessun tecnico trovato.');
        } else {
            console.table(techs);
        }
    } catch (error) {
        console.error('Errore durante la lettura dei tecnici:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
