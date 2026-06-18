import { WorkOrder as PrismaWorkOrder, WorkOrderPriority as PrismaWorkOrderPriority, WorkOrderCategory as PrismaWorkOrderCategory, WorkOrderStatus as PrismaWorkOrderStatus, WorkOrderType as PrismaWorkOrderType } from '@prisma/client';
import { WorkOrder, WorkOrderPriority, WorkOrderCategory, WorkOrderStatus, WorkOrderType } from '../../domain/entities/work-order';

export class WorkOrderMapper {
    public static toDomain(prismaWO: PrismaWorkOrder): WorkOrder {
        return new WorkOrder({
            id: prismaWO.id,
            title: prismaWO.title,
            description: prismaWO.description,
            priority: prismaWO.priority as WorkOrderPriority,
            category: prismaWO.category as WorkOrderCategory,
            status: prismaWO.status as WorkOrderStatus,
            assignedTechnicianId: prismaWO.assignedTechnicianId,
            requesterId: prismaWO.requesterId,
            validatedById: prismaWO.validatedById,
            type: prismaWO.type as WorkOrderType,
            dueDate: prismaWO.dueDate,
            createdAt: prismaWO.createdAt,
            assetId: prismaWO.assetId,
            plantId: prismaWO.plantId,
            originScheduleId: prismaWO.originScheduleId,
            originMeetingId: prismaWO.originMeetingId,
            ewoFilled: prismaWO.ewoFilled
        });
    }

    public static toPrisma(domainWO: WorkOrder): Omit<PrismaWorkOrder, 'createdAt' | 'updatedAt' | 'assignedTo' | 'completionImage' | 'requestImage'> {
        const prismaData: any = {
            title: domainWO.title,
            description: domainWO.description,
            priority: domainWO.priority as PrismaWorkOrderPriority,
            category: domainWO.category as PrismaWorkOrderCategory,
            status: domainWO.status as PrismaWorkOrderStatus,
            assignedTechnicianId: domainWO.assignedTechnicianId || null,
            requesterId: domainWO.requesterId || null,
            validatedById: domainWO.validatedById || null,
            type: domainWO.type as PrismaWorkOrderType,
            dueDate: domainWO.dueDate || null,
            assetId: domainWO.assetId,
            plantId: domainWO.plantId || null,
            originScheduleId: domainWO.originScheduleId || null,
            originMeetingId: domainWO.originMeetingId || null,
            ewoFilled: domainWO.ewoFilled
        };

        if (domainWO.id) {
            prismaData.id = domainWO.id;
        }

        return prismaData;
    }
}
