export interface MeterReadingProps {
    id?: string;
    meterId: string;
    date: Date;
    value: number;
    isAnomaly?: boolean;
    aiAnalysis?: string | null;
    createdAt?: Date;
}

export class MeterReading {
    private props: MeterReadingProps;

    constructor(props: MeterReadingProps) {
        if (!props.meterId) {
            throw new Error('MeterReading must be linked to a Meter');
        }
        if (props.value < 0) {
            throw new Error('MeterReading value cannot be negative');
        }
        this.props = {
            ...props,
            isAnomaly: props.isAnomaly ?? false,
            createdAt: props.createdAt || new Date()
        };
    }

    public get id(): string | undefined { return this.props.id; }
    public get meterId(): string { return this.props.meterId; }
    public get date(): Date { return this.props.date; }
    public get value(): number { return this.props.value; }
    public get isAnomaly(): boolean { return this.props.isAnomaly ?? false; }
    public get aiAnalysis(): string | null | undefined { return this.props.aiAnalysis; }
    public get createdAt(): Date { return this.props.createdAt || new Date(); }

    public toJSON(): MeterReadingProps {
        return { ...this.props };
    }
}
