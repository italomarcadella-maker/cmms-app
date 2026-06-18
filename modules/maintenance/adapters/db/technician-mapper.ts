import { Technician as PrismaTechnician } from '@prisma/client';
import { Technician } from '../../domain/entities/technician';

export class TechnicianMapper {
    public static toDomain(prismaTech: PrismaTechnician): Technician {
        return new Technician({
            id: prismaTech.id,
            name: prismaTech.name,
            specialty: prismaTech.specialty,
            hourlyRate: prismaTech.hourlyRate,
            skills: prismaTech.skills,
            userId: prismaTech.userId
        });
    }

    public static toPrisma(domainTech: Technician): Omit<PrismaTechnician, 'createdAt' | 'updatedAt'> {
        const prismaData: any = {
            name: domainTech.name,
            specialty: domainTech.specialty,
            hourlyRate: domainTech.hourlyRate,
            skills: domainTech.skills,
            userId: domainTech.userId
        };

        if (domainTech.id) {
            prismaData.id = domainTech.id;
        }

        return prismaData;
    }
}
