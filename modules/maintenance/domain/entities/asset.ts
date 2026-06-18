export type AssetStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE' | 'DECOMMISSIONED' | 'STORAGE';
export type AssetType = 'MACHINE' | 'FACILITY' | 'SAFETY' | 'KAIZEN' | 'OTHER';

export interface AssetProps {
    id?: string;
    name: string;
    model: string;
    serialNumber: string;
    vendor?: string | null;
    plantId?: string | null;
    department?: string | null;
    location: string;
    line?: string | null;
    cespite?: string | null;
    purchaseDate: Date;
    status?: AssetStatus;
    healthScore?: number;
    lastMaintenance?: Date | null;
    type?: AssetType;
    warrantyExpiration?: Date | null;
}

export class Asset {
    private props: AssetProps;

    constructor(props: AssetProps) {
        if (!props.name || props.name.trim() === '') {
            throw new Error('Asset name cannot be empty');
        }
        if (!props.serialNumber || props.serialNumber.trim() === '') {
            throw new Error('Asset serial number cannot be empty');
        }
        this.props = {
            ...props,
            status: props.status || 'OPERATIONAL',
            healthScore: props.healthScore !== undefined ? props.healthScore : 100,
            type: props.type || 'MACHINE'
        };
    }

    public get id(): string | undefined { return this.props.id; }
    public get name(): string { return this.props.name; }
    public get model(): string { return this.props.model; }
    public get serialNumber(): string { return this.props.serialNumber; }
    public get vendor(): string | null | undefined { return this.props.vendor; }
    public get plantId(): string | null | undefined { return this.props.plantId; }
    public get department(): string | null | undefined { return this.props.department; }
    public get location(): string { return this.props.location; }
    public get line(): string | null | undefined { return this.props.line; }
    public get cespite(): string | null | undefined { return this.props.cespite; }
    public get purchaseDate(): Date { return this.props.purchaseDate; }
    public get status(): AssetStatus { return this.props.status || 'OPERATIONAL'; }
    public get healthScore(): number { return this.props.healthScore || 100; }
    public get lastMaintenance(): Date | null | undefined { return this.props.lastMaintenance; }
    public get type(): AssetType { return this.props.type || 'MACHINE'; }
    public get warrantyExpiration(): Date | null | undefined { return this.props.warrantyExpiration; }

    public updateHealthScore(score: number): void {
        if (score < 0 || score > 100) {
            throw new Error('Health score must be between 0 and 100');
        }
        this.props.healthScore = score;
    }

    public changeStatus(status: AssetStatus): void {
        this.props.status = status;
    }

    public updateMaintenanceDate(date: Date): void {
        this.props.lastMaintenance = date;
    }

    public toJSON(): AssetProps {
        return { ...this.props };
    }
}
