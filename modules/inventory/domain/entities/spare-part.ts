export interface SparePartProps {
    id?: string;
    name: string;
    category?: string | null;
    description?: string | null;
    warehouse?: string | null;
    vendor?: string | null;
    quantity: number;
    minQuantity?: number;
    location?: string | null;
    plantId?: string | null;
    unitCost?: number;
    lastUpdated?: Date;
}

export class SparePart {
    private props: SparePartProps;

    constructor(props: SparePartProps) {
        if (!props.name || props.name.trim() === '') {
            throw new Error('SparePart name cannot be empty');
        }
        if (props.quantity < 0) {
            throw new Error('SparePart quantity cannot be negative');
        }
        this.props = {
            ...props,
            minQuantity: props.minQuantity ?? 0,
            lastUpdated: props.lastUpdated || new Date()
        };
    }

    public get id(): string | undefined { return this.props.id; }
    public get name(): string { return this.props.name; }
    public get category(): string | null | undefined { return this.props.category; }
    public get description(): string | null | undefined { return this.props.description; }
    public get warehouse(): string | null | undefined { return this.props.warehouse; }
    public get vendor(): string | null | undefined { return this.props.vendor; }
    public get quantity(): number { return this.props.quantity; }
    public get minQuantity(): number { return this.props.minQuantity ?? 0; }
    public get location(): string | null | undefined { return this.props.location; }
    public get plantId(): string | null | undefined { return this.props.plantId; }
    public get unitCost(): number { return this.props.unitCost ?? 0; }
    public get lastUpdated(): Date { return this.props.lastUpdated || new Date(); }

    public adjustQuantity(amount: number): void {
        const newQty = this.props.quantity + amount;
        if (newQty < 0) {
            throw new Error('Insufficient spare part stock');
        }
        this.props.quantity = newQty;
        this.props.lastUpdated = new Date();
    }

    public toJSON(): SparePartProps {
        return { ...this.props };
    }
}
