import { ISparePartRepository } from '../../domain/ports/spare-part-repository';
import { SparePart } from '../../domain/entities/spare-part';
import { SparePartMapper } from './spare-part-mapper';
import { prisma } from '@/lib/prisma';

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
        let saved;
        if (part.id) {
            saved = await prisma.sparePart.update({
                where: { id: part.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.sparePart.create({
                data: prismaData as any
            });
        }
        return SparePartMapper.toDomain(saved);
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
