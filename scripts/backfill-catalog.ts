// Collega al catalogo di gruppo tutte le righe di magazzino che non hanno ancora una voce (idempotente).
// Uso: set -a; source .env; set +a; npx ts-node --transpile-only -O '{"module":"commonjs","moduleResolution":"node"}' scripts/backfill-catalog.ts
import { PrismaClient } from '@prisma/client';
import { resolveCatalogId } from '../modules/inventory/adapters/db/catalog-service';

const prisma = new PrismaClient();

async function main() {
    const parts = await prisma.sparePart.findMany({ where: { catalogId: null }, orderBy: { name: 'asc' } });
    console.log(`Righe da collegare: ${parts.length}`);
    for (const part of parts) {
        const catalogId = await resolveCatalogId(prisma as any, part);
        await prisma.sparePart.update({ where: { id: part.id }, data: { catalogId } });
        console.log(` - ${part.name} -> ${catalogId}`);
    }
    const entries = await prisma.sparePartCatalog.count();
    console.log(`Voci nel catalogo: ${entries}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
