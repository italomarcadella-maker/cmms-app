// Seed di SVILUPPO: crea utenti con password di prova. Non eseguirlo mai su un database reale.
if (process.env.ALLOW_DEV_SEED !== '1') {
    console.error('Seed di sviluppo con password di prova: per eseguirlo su un database di prova imposta ALLOW_DEV_SEED=1. Non usarlo in produzione.');
    process.exit(1);
}


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const asset = await prisma.asset.findFirst();

    if (!asset) {
        console.log("No asset found, creating one...");
        await prisma.asset.create({
            data: {
                name: "Test Asset for PM",
                model: "M1",
                serialNumber: "PM-TEST-SN",
                location: "Test Loc",
                purchaseDate: new Date(),
                status: "OPERATIONAL"
            }
        });
    }

    const existingAsset = await prisma.asset.findFirst();

    if (existingAsset) {
        await prisma.preventiveSchedule.create({
            data: {
                assetId: existingAsset.id,
                taskTitle: "Annual Inspection (Seeded)",
                description: "Check generated from seed",
                frequencyDays: 365,
                nextDueDate: new Date(),
            }
        });
        console.log("Seeded PM Schedule");
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
