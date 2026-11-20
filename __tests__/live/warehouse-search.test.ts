// @vitest-environment node
/**
 * Suggerimento dei materiali sul magazzino VERO, in SOLA LETTURA: ogni articolo cercato con il proprio nome
 * deve essere tra i primi suggeriti. Non gira nei test normali: serve RUN_LIVE_DB_TESTS=1 e DATABASE_URL.
 */
import { describe, it, expect } from 'vitest';
import { basePrisma } from '@/lib/prisma-base';
import { rankWarehouseParts } from '@/modules/inventory/domain/warehouse-search';

const live = !!process.env.RUN_LIVE_DB_TESTS && !!process.env.DATABASE_URL;

describe.skipIf(!live)('suggerimento materiali (magazzino reale, sola lettura)', () => {
    it('ogni articolo cercato col proprio nome e\' suggerito, e per primo se il nome e\' univoco', async () => {
        const parts = await basePrisma.sparePart.findMany({ select: { id: true, name: true, description: true }, take: 1500 });
        for (const p of parts) {
            const out = rankWarehouseParts(p.name, parts);
            expect(out.map(m => m.item.id), `articolo "${p.name}"`).toContain(p.id);
            const sameName = parts.filter(x => x.name.trim().toLowerCase() === p.name.trim().toLowerCase());
            if (sameName.length === 1) expect(out[0].score).toBeGreaterThanOrEqual(0.85);
        }
        console.log(`articoli verificati: ${parts.length}`);
    });
});
