import { IWorkOrderRepository } from '../../domain/ports/work-order-repository';
import { WorkOrder } from '../../domain/entities/work-order';
import { WorkOrderMapper } from './work-order-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaWorkOrderRepository implements IWorkOrderRepository {
    async findById(id: string): Promise<WorkOrder | null> {
        const raw = await prisma.workOrder.findUnique({
            where: { id }
        });
        return raw ? WorkOrderMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<WorkOrder[]> {
        const raws = await prisma.workOrder.findMany();
        return raws.map(WorkOrderMapper.toDomain);
    }

    async save(wo: WorkOrder): Promise<WorkOrder> {
        const prismaData = WorkOrderMapper.toPrisma(wo);
        let saved;
        if (wo.id) {
            saved = await prisma.workOrder.update({
                where: { id: wo.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.workOrder.create({
                data: prismaData as any
            });
        }
        return WorkOrderMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.workOrder.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting work order ${id}:`, error);
            return false;
        }
    }
}
