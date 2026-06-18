export interface MeterProps {
    id?: string;
    name: string;
    type: string; // ELEC, WATER, GAS
    unit: string; // kWh, m3
    serialNumber?: string | null;
    location?: string | null;
    installationDate?: Date | null;
}

export class Meter {
    private props: MeterProps;

    constructor(props: MeterProps) {
        if (!props.name || props.name.trim() === '') {
            throw new Error('Meter name cannot be empty');
        }
        if (!props.type || props.type.trim() === '') {
            throw new Error('Meter type cannot be empty');
        }
        if (!props.unit || props.unit.trim() === '') {
            throw new Error('Meter unit cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get name(): string { return this.props.name; }
    public get type(): string { return this.props.type; }
    public get unit(): string { return this.props.unit; }
    public get serialNumber(): string | null | undefined { return this.props.serialNumber; }
    public get location(): string | null | undefined { return this.props.location; }
    public get installationDate(): Date | null | undefined { return this.props.installationDate; }

    public toJSON(): MeterProps {
        return { ...this.props };
    }
}
