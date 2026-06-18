export interface ProcessAnomalyProps {
    id?: string;
    assetId: string;
    description: string;
    detectedAt: Date;
    aiRecommendation?: string | null;
    isPredictive: boolean;
    autoRcaData?: any;
    isResolved: boolean;
}

export class ProcessAnomaly {
    private props: ProcessAnomalyProps;

    constructor(props: ProcessAnomalyProps) {
        if (!props.description || props.description.trim() === '') {
            throw new Error('Anomaly description cannot be empty');
        }
        if (!props.assetId || props.assetId.trim() === '') {
            throw new Error('Anomaly assetId cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get assetId(): string { return this.props.assetId; }
    public get description(): string { return this.props.description; }
    public get detectedAt(): Date { return this.props.detectedAt; }
    public get aiRecommendation(): string | null | undefined { return this.props.aiRecommendation; }
    public get isPredictive(): boolean { return this.props.isPredictive; }
    public get autoRcaData(): any { return this.props.autoRcaData; }
    public get isResolved(): boolean { return this.props.isResolved; }

    public toJSON(): ProcessAnomalyProps {
        return { ...this.props };
    }
}
