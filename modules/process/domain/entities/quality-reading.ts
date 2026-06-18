export interface QualityReadingProps {
    id?: string;
    recipeId: string;
    value: number;
    timestamp?: Date;
}

export class QualityReading {
    private props: QualityReadingProps;

    constructor(props: QualityReadingProps) {
        if (!props.recipeId || props.recipeId.trim() === '') {
            throw new Error('QualityReading recipeId cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get recipeId(): string { return this.props.recipeId; }
    public get value(): number { return this.props.value; }
    public get timestamp(): Date | undefined { return this.props.timestamp; }

    public toJSON(): QualityReadingProps {
        return { ...this.props };
    }
}
