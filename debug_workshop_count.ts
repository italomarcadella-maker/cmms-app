
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugWorkshopCount() {
    console.log("Analyzing Workshop Requests...");

    const conditions = {
        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] },
        OR: [
            { asset: { location: { contains: 'OFFICINA', mode: 'insensitive' } } },
            { category: 'MECHANICAL' },
            { assetId: 'SYS-WORKSHOP' }
        ]
    };

    // 1. Count
    const count = await prisma.workOrder.count({
        where: conditions as any
    });

    console.log(`Total Count returned by Widget Logic: ${count}`);

    // 2. Details
    const requests = await prisma.workOrder.findMany({
        where: conditions as any,
        select: {
            id: true,
            title: true,
            status: true,
            category: true,
            assetId: true,
            asset: {
                select: {
                    name: true,
                    location: true
                }
            },
            createdAt: true
        }
    });

    console.log("\n--- Detailed Requests ---");
    requests.forEach(r => {
        console.log(`[${r.id}] ${r.title}`);
        console.log(`    Status: ${r.status}`);
        console.log(`    Category: ${r.category}`);
        console.log(`    Asset: ${r.assetId} (${r.asset?.location})`);
        console.log(`    Created: ${r.createdAt}`);
        console.log("-------------------------");
    });
}

debugWorkshopCount()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
