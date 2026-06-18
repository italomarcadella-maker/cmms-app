import { ITechnicianRepository } from '../../domain/ports/technician-repository';
import { Technician } from '../../domain/entities/technician';
import { TechnicianMapper } from './technician-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaTechnicianRepository implements ITechnicianRepository {
    async findById(id: string): Promise<Technician | null> {
        const raw = await prisma.technician.findUnique({
            where: { id }
        });
        return raw ? TechnicianMapper.toDomain(raw) : null;
    }

    async findByUserId(userId: string): Promise<Technician | null> {
        const raw = await prisma.technician.findUnique({
            where: { userId }
        });
        return raw ? TechnicianMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<Technician[]> {
        const raws = await prisma.technician.findMany();
        return raws.map(TechnicianMapper.toDomain);
    }

    async save(tech: Technician): Promise<Technician> {
        const prismaData = TechnicianMapper.toPrisma(tech);
        let saved;
        if (tech.id) {
            saved = await prisma.technician.update({
                where: { id: tech.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.technician.create({
                data: prismaData as any
            });
        }
        return TechnicianMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.technician.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting technician ${id}:`, error);
            return false;
        }
    }
}
