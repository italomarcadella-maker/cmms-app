
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAllWOs() {
    console.log("Listing ALL Active Work Orders...");

    const wos = await prisma.workOrder.findMany({
        where: {
            status: { notIn: ['CLOSED', 'COMPLETED', 'CANCELED'] }
        },
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
            type: true,
            createdAt: true
        }
    });

    console.log(`\nFound ${wos.length} Active WOs:`);
    wos.forEach(r => {
        let isWorkshop = false;
        // Check filtering logic
        if (['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(r.status)) {
            if (r.asset?.location?.toLowerCase().includes('officina') ||
                r.category === 'MECHANICAL' ||
                r.assetId === 'SYS-WORKSHOP') {
                isWorkshop = true;
            }
        }

        console.log(`[${r.id}] ${r.title}`);
        console.log(`    Status: ${r.status}`);
        console.log(`    Category: ${r.category} | Type: ${r.type}`);
        console.log(`    Asset: ${r.asset?.name} (${r.asset?.location}) [${r.assetId}]`);
        console.log(`    IS_WORKSHOP_WIDGET_MATCH: ${isWorkshop}`);
        console.log("-------------------------");
    });
}

debugAllWOs()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
