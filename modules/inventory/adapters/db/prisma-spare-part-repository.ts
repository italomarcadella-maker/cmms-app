import { ISparePartRepository } from '../../domain/ports/spare-part-repository';
import { SparePart } from '../../domain/entities/spare-part';
import { SparePartMapper } from './spare-part-mapper';
import { prisma } from '@/lib/prisma';
import { resolveCatalogId } from './catalog-service';
import { applyStockChange, currentStockActor, recordStockMovement, InsufficientStockError, StockPartNotFoundError } from '@/lib/stock-ledger';
import type { StockMovementType } from '../../domain/stock-movement';

export class PrismaSparePartRepository implements ISparePartRepository {
    async findById(id: string): Promise<SparePart | null> {
        const raw = await prisma.sparePart.findUnique({
            where: { id }
        });
        return raw ? SparePartMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<SparePart[]> {
        const raws = await prisma.sparePart.findMany({
            orderBy: { name: 'asc' }
        });
        return raws.map(SparePartMapper.toDomain);
    }

    async save(part: SparePart, opts?: { note?: string }): Promise<SparePart> {
        const prismaData = SparePartMapper.toPrisma(part);
        // Ogni riga di magazzino e' collegata alla voce di catalogo di gruppo (riconosciuta dalla descrizione)
        const catalogId = await resolveCatalogId(prisma as any, part);
        const actor = await currentStockActor();
        // Salvataggio e movimento nella stessa transazione: se il movimento non si scrive, non cambia nemmeno la giacenza
        const saved = await prisma.$transaction(async tx => {
            if (part.id) {
                const before = await tx.sparePart.findUnique({ where: { id: part.id }, select: { quantity: true } });
                if (!before) throw new StockPartNotFoundError(part.id);
                const changed = before.quantity !== part.quantity;
                // Se la giacenza cambia nel frattempo l'aggiornamento non trova la riga e fallisce (P2025): nessuna sovrascrittura silenziosa
                const row = await tx.sparePart.update({
                    where: { id: part.id, quantity: before.quantity },
                    data: { ...prismaData, catalogId } as any,
                });
                if (changed) {
                    await recordStockMovement(tx, {
                        partId: row.id, type: 'ADJUSTMENT', delta: part.quantity - before.quantity,
                        note: opts?.note ?? 'Rettifica manuale della giacenza', actor,
                    });
                }
                return row;
            }
            const row = await tx.sparePart.create({ data: { ...prismaData, catalogId } as any });
            if (row.quantity > 0) {
                await recordStockMovement(tx, { partId: row.id, type: 'INITIAL', delta: row.quantity, note: 'Giacenza iniziale', actor });
            }
            return row;
        });
        return SparePartMapper.toDomain(saved);
    }

    async adjustQuantity(id: string, delta: number, opts?: { type?: StockMovementType; reference?: string; note?: string }): Promise<SparePart | null> {
        try {
            const raw = await prisma.$transaction(async tx => {
                await applyStockChange(tx, {
                    partId: id,
                    delta,
                    type: opts?.type ?? (delta > 0 ? 'RECEIPT' : 'CONSUMPTION'),
                    reference: opts?.reference,
                    note: opts?.note ?? (delta > 0 ? 'Carico manuale dalla pagina magazzino' : 'Scarico manuale dalla pagina magazzino'),
                });
                return tx.sparePart.findUnique({ where: { id } });
            });
            return raw ? SparePartMapper.toDomain(raw) : null;
        } catch (e) {
            // Scarico oltre la giacenza o articolo inesistente: nessuna modifica, risposta "null" come prima
            if (e instanceof InsufficientStockError || e instanceof StockPartNotFoundError) return null;
            throw e;
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.sparePart.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting spare part ${id}:`, error);
            return false;
        }
    }
}
