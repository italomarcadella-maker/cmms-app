export interface LineSimulationProps {
    id?: string;
    name: string;
    layout: string;
    assetId?: string | null;
    leanScore: number;
    lineEff: number;
    dataJson: any;
    createdAt?: Date;
    updatedAt?: Date;
}

export class LineSimulation {
    private props: LineSimulationProps;

    constructor(props: LineSimulationProps) {
        if (!props.name || props.name.trim() === '') {
            throw new Error('Simulation name cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get name(): string { return this.props.name; }
    public get layout(): string { return this.props.layout; }
    public get assetId(): string | null | undefined { return this.props.assetId; }
    public get leanScore(): number { return this.props.leanScore; }
    public get lineEff(): number { return this.props.lineEff; }
    public get dataJson(): any { return this.props.dataJson; }
    public get createdAt(): Date | undefined { return this.props.createdAt; }
    public get updatedAt(): Date | undefined { return this.props.updatedAt; }

    public toJSON(): LineSimulationProps {
        return { ...this.props };
    }
}
