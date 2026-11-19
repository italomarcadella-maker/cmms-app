// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { computeScope, scopeKey, scopeFromKey, userScopeWhere, ALL_PLANTS } from '@/lib/plant-scope';
import { plantFilter, SCOPED_MODELS } from '@/lib/prisma';

const A = 'plant-a';
const B = 'plant-b';
const C = 'plant-c';

describe('computeScope', () => {
    it('nega tutto se non c\'e\' un utente', () => {
        expect(computeScope({}).mode).toBe('none');
    });

    it('admin: vede tutto su "Tutti", un solo plant se lo sceglie', () => {
        const all = computeScope({ userId: 'u', role: 'ADMIN', allPlantIds: [A, B, C], selected: ALL_PLANTS });
        expect(all.mode).toBe('all');
        expect(all.selected).toBe(ALL_PLANTS);

        const one = computeScope({ userId: 'u', role: 'ADMIN', allPlantIds: [A, B, C], selected: B });
        expect(one.mode).toBe('plants');
        expect(one.plantIds).toEqual([B]);
    });

    it('admin: un cookie con un plant inesistente ricade su "Tutti"', () => {
        const s = computeScope({ userId: 'u', role: 'ADMIN', allPlantIds: [A, B], selected: 'inventato' });
        expect(s.mode).toBe('all');
    });

    it('responsabile con due plant: default = entrambi, puo\' scegliere uno dei suoi', () => {
        const base = { userId: 'u', role: 'PLANT_MANAGER', memberPlantIds: [A, B], homePlantId: A };
        expect(computeScope(base).plantIds.sort()).toEqual([A, B]);
        expect(computeScope({ ...base, selected: B }).plantIds).toEqual([B]);
    });

    it('responsabile: NON puo\' scegliere un plant non assegnato (cookie falsificato)', () => {
        const s = computeScope({ userId: 'u', role: 'PLANT_MANAGER', memberPlantIds: [A], homePlantId: A, selected: B });
        expect(s.mode).toBe('plants');
        expect(s.plantIds).toEqual([A]);
    });

    it('responsabile: "ALL" nel cookie non allarga oltre i suoi plant', () => {
        const s = computeScope({ userId: 'u', role: 'PLANT_MANAGER', memberPlantIds: [A], selected: ALL_PLANTS });
        expect(s.mode).toBe('plants');
        expect(s.plantIds).toEqual([A]);
    });

    it('utente non admin senza plant: nessun dato', () => {
        expect(computeScope({ userId: 'u', role: 'MAINTAINER', memberPlantIds: [] }).mode).toBe('none');
    });

    it('il plant di casa conta anche senza riga in UserPlant', () => {
        const s = computeScope({ userId: 'u', role: 'MAINTAINER', memberPlantIds: [], homePlantId: A });
        expect(s.plantIds).toEqual([A]);
    });

    it('un ruolo diverso da ADMIN non diventa admin passando allPlantIds', () => {
        const s = computeScope({ userId: 'u', role: 'SUPERVISOR', memberPlantIds: [A], allPlantIds: [A, B, C] });
        expect(s.plantIds).toEqual([A]);
        expect(s.isAdmin).toBe(false);
    });
});

describe('chiave di cache dello scope', () => {
    it('e\' indipendente dall\'ordine dei plant e si ricostruisce', () => {
        const s1 = computeScope({ userId: 'u', role: 'PLANT_MANAGER', memberPlantIds: [A, B] });
        const s2 = computeScope({ userId: 'u', role: 'PLANT_MANAGER', memberPlantIds: [B, A] });
        expect(scopeKey(s1)).toBe(scopeKey(s2));
        expect(scopeFromKey(scopeKey(s1)).plantIds.sort()).toEqual([A, B]);
    });

    it('plant diversi hanno chiavi diverse, "all" e "none" restano distinti', () => {
        const ka = scopeKey(computeScope({ userId: 'u', role: 'MAINTAINER', memberPlantIds: [A] }));
        const kb = scopeKey(computeScope({ userId: 'u', role: 'MAINTAINER', memberPlantIds: [B] }));
        expect(ka).not.toBe(kb);
        expect(scopeKey(computeScope({ userId: 'u', role: 'ADMIN', allPlantIds: [A] }))).toBe('all');
        expect(scopeKey(computeScope({}))).toBe('none');
        expect(scopeFromKey('none').mode).toBe('none');
    });
});

describe('filtro per plant dei modelli', () => {
    it('filtra direttamente i modelli con plantId', () => {
        expect(plantFilter('WorkOrder', [A])).toEqual({ plantId: { in: [A] } });
        expect(plantFilter('SparePart', [A, B])).toEqual({ plantId: { in: [A, B] } });
    });

    it('i modelli figli ereditano il plant dal padre', () => {
        expect(plantFilter('ChecklistItem', [A])).toEqual({ workOrder: { plantId: { in: [A] } } });
        expect(plantFilter('MeetingActionItem', [A])).toEqual({ section: { meeting: { plantId: { in: [A] } } } });
    });

    it('gli asset di sistema SYS-* restano visibili a tutti', () => {
        const f = plantFilter('Asset', [A]) as { OR: unknown[] };
        expect(f.OR).toContainEqual({ id: { startsWith: 'SYS-' } });
    });

    it('un modello globale non ha filtro', () => {
        expect(plantFilter('SparePartCatalog', [A])).toBeNull();
        expect(plantFilter('MaintenanceKnowledge', [A])).toBeNull();
        expect(plantFilter('User', [A])).toBeNull();
    });

    it('con zero plant il filtro non lascia passare nulla', () => {
        expect(plantFilter('WorkOrder', [])).toEqual({ plantId: { in: [] } });
    });

    it('userScopeWhere: nessun filtro per admin, filtro per plant per gli altri', () => {
        expect(userScopeWhere(computeScope({ userId: 'u', role: 'ADMIN', allPlantIds: [A] }))).toEqual({});
        const w = userScopeWhere(computeScope({ userId: 'u', role: 'PLANT_MANAGER', memberPlantIds: [A] })) as { OR: unknown[] };
        expect(w.OR).toHaveLength(2);
    });
});

describe('copertura dello schema', () => {
    // Modelli che hanno un legame con un plant ma che e' voluto restino senza filtro
    const INTENTIONAL_GLOBAL = new Set([
        'User', // anagrafica: filtrata con userScopeWhere dove serve; il login deve poter leggere l'utente
        'UserPlant', // assegnazioni: gestite solo dall'admin
        'SharedTemplate', // libreria di gruppo, condivisa per definizione
    ]);

    it('ogni modello con una relazione a Plant e\' soggetto a scope (o dichiarato globale)', () => {
        const models = Prisma.dmmf.datamodel.models;
        const withPlant = models
            .filter(m => m.fields.some(f => f.type === 'Plant'))
            .map(m => m.name)
            .filter(n => n !== 'Plant');
        const missing = withPlant.filter(n => !SCOPED_MODELS.includes(n) && !INTENTIONAL_GLOBAL.has(n));
        expect(missing).toEqual([]);
    });

    it('ogni modello figlio di Asset / WorkOrder / Meter / Project e\' filtrato (nessun dato orfano visibile tra plant)', () => {
        const parents = ['Asset', 'WorkOrder', 'Meter', 'Component', 'Project', 'DailyMeeting'];
        const models = Prisma.dmmf.datamodel.models;
        // I figli che hanno una relazione obbligatoria verso uno di questi padri
        const children = models.filter(m => m.fields.some(f => parents.includes(f.type) && f.relationFromFields && f.relationFromFields.length > 0 && f.isRequired));
        const allowed = new Set([
            ...SCOPED_MODELS,
            'AuditLog', 'Notification', 'EnergyLog',
            'ProjectTaskNote', 'SopFeedback', // coperti via figli
            'PurchaseRequest',
        ]);
        const unfiltered = children.map(m => m.name).filter(n => !allowed.has(n));
        expect(unfiltered).toEqual([]);
    });
});

describe('regole di codice', () => {
    const root = path.resolve(process.cwd());
    const SRC_DIRS = ['app', 'lib', 'modules', 'components'];

    function walk(dir: string, out: string[] = []): string[] {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name === '.next') continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full, out);
            else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
        }
        return out;
    }
    const files = SRC_DIRS.flatMap(d => walk(path.join(root, d)));

    it('unstable_cache si usa solo tramite scopedCache (altrimenti la cache mescola i plant)', () => {
        const offenders = files
            .filter(f => !f.endsWith(path.join('lib', 'scoped-cache.ts')))
            .filter(f => /\bunstable_cache\b/.test(fs.readFileSync(f, 'utf8')))
            .map(f => path.relative(root, f));
        expect(offenders).toEqual([]);
    });

    it('nessun nuovo PrismaClient nel codice applicativo (aggirerebbe il filtro per plant)', () => {
        const offenders = files
            .filter(f => !f.endsWith(path.join('lib', 'prisma-base.ts')))
            .filter(f => /new PrismaClient\(/.test(fs.readFileSync(f, 'utf8')))
            .map(f => path.relative(root, f));
        expect(offenders).toEqual([]);
    });

    it('basePrisma (non filtrato) e\' importato solo dal motore dello scope e dalle azioni dei plant/analisi trasversali', () => {
        const allowed = ['lib/prisma.ts', 'lib/plant-scope.ts', 'lib/plant-actions.ts', 'lib/prisma-base.ts'];
        const offenders = files
            .map(f => path.relative(root, f).replace(/\\/g, '/'))
            .filter(rel => !allowed.includes(rel))
            .filter(rel => /prisma-base/.test(fs.readFileSync(path.join(root, rel), 'utf8')));
        expect(offenders).toEqual([]);
    });
});
