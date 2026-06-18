export interface PurchaseRequestProps {
    id?: string;
    partId: string;
    quantity: number;
    status?: string;
    reason?: string | null;
    expectedCost?: number | null;
    requestedAt?: Date;
    orderedAt?: Date | null;
    receivedAt?: Date | null;
}

export class PurchaseRequest {
    private props: PurchaseRequestProps;

    constructor(props: PurchaseRequestProps) {
        if (!props.partId) {
            throw new Error('PurchaseRequest must be linked to a SparePart');
        }
        if (props.quantity <= 0) {
            throw new Error('PurchaseRequest quantity must be greater than zero');
        }
        this.props = {
            ...props,
            status: props.status || 'DRAFT',
            requestedAt: props.requestedAt || new Date()
        };
    }

    public get id(): string | undefined { return this.props.id; }
    public get partId(): string { return this.props.partId; }
    public get quantity(): number { return this.props.quantity; }
    public get status(): string { return this.props.status || 'DRAFT'; }
    public get reason(): string | null | undefined { return this.props.reason; }
    public get expectedCost(): number | null | undefined { return this.props.expectedCost; }
    public get requestedAt(): Date { return this.props.requestedAt || new Date(); }
    public get orderedAt(): Date | null | undefined { return this.props.orderedAt; }
    public get receivedAt(): Date | null | undefined { return this.props.receivedAt; }

    public updateStatus(newStatus: string): void {
        this.props.status = newStatus;
        if (newStatus === 'ORDERED') {
            this.props.orderedAt = new Date();
        } else if (newStatus === 'RECEIVED') {
            this.props.receivedAt = new Date();
        }
    }

    public toJSON(): PurchaseRequestProps {
        return { ...this.props };
    }
}
