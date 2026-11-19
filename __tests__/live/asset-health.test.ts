// @vitest-environment node
/**
 * Calcolo della salute degli asset sul database VERO, in SOLA LETTURA (non scrive nulla).
 * Non gira nei test normali: serve RUN_LIVE_DB_TESTS=1 e DATABASE_URL.
 *   set -a; source .env; set +a; RUN_LIVE_DB_TESTS=1 npx vitest run __tests__/live
 */
import { describe, it, expect } from 'vitest';
import { basePrisma } from '@/lib/prisma-base';
import { runUnscoped } from '@/lib/plant-scope';
import { computeHealthForAssets, loadHealthConfig } from '@/lib/asset-health-sync';

const live = !!process.env.RUN_LIVE_DB_TESTS && !!process.env.DATABASE_URL;

describe.skipIf(!live)('salute degli asset (database reale, sola lettura)', () => {
    it('le query raggruppate sono valide e il punteggio e\' coerente per ogni macchina', async () => {
        const config = await runUnscoped(() => loadHealthConfig());
        const entries = await runUnscoped(() => computeHealthForAssets(null, config));
        const realAssets = await basePrisma.asset.count({ where: { NOT: { id: { startsWith: 'SYS-' } } } });

        // Un risultato per ogni macchina vera, nessuno per gli asset di sistema
        expect(entries.size).toBe(realAssets);
        for (const [id, e] of entries) {
            expect(id.startsWith('SYS-')).toBe(false);
            const { score } = e.health;
            if (score !== null) {
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(100);
                if (e.health.capped) expect(score).toBeLessThanOrEqual(config.noPlanCap);
            } else {
                expect(e.health.notEvaluableReason).toBeTruthy();
            }
        }
    });

    it('le colonne nuove esistono (completedAt, createdAt, healthConfig)', async () => {
        await expect(basePrisma.workOrder.count({ where: { completedAt: null } })).resolves.toBeTypeOf('number');
        await expect(basePrisma.asset.count({ where: { createdAt: { lte: new Date() } } })).resolves.toBeTypeOf('number');
        await expect(basePrisma.systemSettings.findFirst({ select: { healthConfig: true } })).resolves.not.toBeUndefined();
    });
});
