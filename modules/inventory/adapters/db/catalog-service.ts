import { findSameItem, normalizeKey } from '../../domain/catalog-matching';

/**
 * Collegamento di una riga di magazzino alla voce del catalogo di gruppo.
 * Riceve il client come parametro (nessun import dell'app) cosi' lo usano sia il repository sia gli script.
 */
interface CatalogDb {
    sparePartCatalog: {
        findMany: (args: any) => Promise<{ id: string; name: string }[]>;
        findUnique: (args: any) => Promise<{ id: string } | null>;
        create: (args: any) => Promise<{ id: string }>;
    };
}

export interface CatalogSource {
    name: string;
    category?: string | null;
    vendor?: string | null;
    description?: string | null;
}

export async function resolveCatalogId(db: CatalogDb, part: CatalogSource): Promise<string> {
    const catalog = await db.sparePartCatalog.findMany({ select: { id: true, name: true } });
    const match = findSameItem(part.name, catalog);
    if (match) return match.id;

    const normalizedKey = normalizeKey(part.name);
    try {
        const created = await db.sparePartCatalog.create({
            data: {
                name: part.name.trim(),
                normalizedKey,
                category: part.category ?? null,
                vendor: part.vendor ?? null,
                description: part.description ?? null,
            },
        });
        return created.id;
    } catch (err) {
        // Creata nel frattempo da un'altra richiesta: si riusa quella
        const existing = await db.sparePartCatalog.findUnique({ where: { normalizedKey } });
        if (existing) return existing.id;
        throw err;
    }
}
