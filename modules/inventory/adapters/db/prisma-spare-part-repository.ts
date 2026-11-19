import { ISparePartRepository } from '../../domain/ports/spare-part-repository';
import { SparePart } from '../../domain/entities/spare-part';
import { SparePartMapper } from './spare-part-mapper';
import { prisma } from '@/lib/prisma';
import { resolveCatalogId } from './catalog-service';

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

    async save(part: SparePart): Promise<SparePart> {
        const prismaData = SparePartMapper.toPrisma(part);
        // Ogni riga di magazzino e' collegata alla voce di catalogo di gruppo (riconosciuta dalla descrizione)
        const catalogId = await resolveCatalogId(prisma as any, part);
        let saved;
        if (part.id) {
            saved = await prisma.sparePart.update({
                where: { id: part.id },
                data: { ...prismaData, catalogId } as any
            });
        } else {
            saved = await prisma.sparePart.create({
                data: { ...prismaData, catalogId } as any
            });
        }
        return SparePartMapper.toDomain(saved);
    }

    async adjustQuantity(id: string, delta: number): Promise<SparePart | null> {
        const changed = delta >= 0
            ? await prisma.sparePart.updateMany({ where: { id }, data: { quantity: { increment: delta }, lastUpdated: new Date() } })
            : await prisma.sparePart.updateMany({ where: { id, quantity: { gte: -delta } }, data: { quantity: { decrement: -delta }, lastUpdated: new Date() } });
        if (changed.count !== 1) return null;
        const raw = await prisma.sparePart.findUnique({ where: { id } });
        return raw ? SparePartMapper.toDomain(raw) : null;
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
