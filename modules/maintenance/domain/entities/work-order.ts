export type WorkOrderPriority = 'STOPPED' | 'MALFUNCTIONING' | 'WORKING' | 'NOT_PRODUCTION' | 'HIGH' | 'MEDIUM' | 'LOW';
export type WorkOrderCategory = 'MECHANICAL' | 'ELECTRICAL' | 'HYDRAULIC' | 'PNEUMATIC' | 'SOFTWARE' | 'CIVIL' | 'OTHER' | 'SAFETY' | 'IMPROVEMENT' | 'AI_SUGGESTION';
export type WorkOrderStatus = 'OPEN' | 'PENDING_APPROVAL' | 'APPROVED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'PENDING_REVIEW' | 'COMPLETED' | 'CLOSED' | 'CANCELED';
export type WorkOrderType = 'FAULT' | 'ROUTINE' | 'REQUEST';

export interface WorkOrderProps {
    id?: string;
    title: string;
    description: string;
    priority: WorkOrderPriority;
    category: WorkOrderCategory;
    status?: WorkOrderStatus;
    assignedTechnicianId?: string | null;
    requesterId?: string | null;
    validatedById?: string | null;
    type?: WorkOrderType;
    dueDate?: Date | null;
    createdAt?: Date;
    assetId: string;
    plantId?: string | null;
    originScheduleId?: string | null;
    originMeetingId?: string | null;
    ewoFilled?: boolean;
}

export class WorkOrder {
    private props: WorkOrderProps;

    constructor(props: WorkOrderProps) {
        if (!props.title || props.title.trim() === '') {
            throw new Error('WorkOrder title cannot be empty');
        }
        if (!props.assetId) {
            throw new Error('WorkOrder must belong to an Asset');
        }
        this.props = {
            ...props,
            status: props.status || 'OPEN',
            type: props.type || 'FAULT',
            createdAt: props.createdAt || new Date(),
            ewoFilled: props.ewoFilled || false
        };
    }

    public get id(): string | undefined { return this.props.id; }
    public get title(): string { return this.props.title; }
    public get description(): string { return this.props.description; }
    public get priority(): WorkOrderPriority { return this.props.priority; }
    public get category(): WorkOrderCategory { return this.props.category; }
    public get status(): WorkOrderStatus { return this.props.status || 'OPEN'; }
    public get assignedTechnicianId(): string | null | undefined { return this.props.assignedTechnicianId; }
    public get requesterId(): string | null | undefined { return this.props.requesterId; }
    public get validatedById(): string | null | undefined { return this.props.validatedById; }
    public get type(): WorkOrderType { return this.props.type || 'FAULT'; }
    public get dueDate(): Date | null | undefined { return this.props.dueDate; }
    public get createdAt(): Date { return this.props.createdAt || new Date(); }
    public get assetId(): string { return this.props.assetId; }
    public get plantId(): string | null | undefined { return this.props.plantId; }
    public get originScheduleId(): string | null | undefined { return this.props.originScheduleId; }
    public get originMeetingId(): string | null | undefined { return this.props.originMeetingId; }
    public get ewoFilled(): boolean { return this.props.ewoFilled || false; }

    public changeStatus(newStatus: WorkOrderStatus): void {
        this.props.status = newStatus;
    }

    public assignTo(technicianId: string | null): void {
        this.props.assignedTechnicianId = technicianId;
        if (technicianId && this.props.status === 'OPEN') {
            this.props.status = 'ASSIGNED';
        }
    }

    public fillEWO(): void {
        this.props.ewoFilled = true;
    }

    public toJSON(): WorkOrderProps {
        return { ...this.props };
    }
}
