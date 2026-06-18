export interface SopDocumentProps {
    id?: string;
    title: string;
    assetId: string;
    imageUrl?: string | null;
    author: string;
    isApproved: boolean;
    aiExtractedParameters: string;
    line?: string | null;
    product?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class SopDocument {
    private props: SopDocumentProps;

    constructor(props: SopDocumentProps) {
        if (!props.title || props.title.trim() === '') {
            throw new Error('SOP title cannot be empty');
        }
        if (!props.assetId || props.assetId.trim() === '') {
            throw new Error('SOP assetId cannot be empty');
        }
        if (props.aiExtractedParameters === undefined || props.aiExtractedParameters === null) {
            throw new Error('SOP aiExtractedParameters cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get title(): string { return this.props.title; }
    public get assetId(): string { return this.props.assetId; }
    public get imageUrl(): string | null | undefined { return this.props.imageUrl; }
    public get author(): string { return this.props.author; }
    public get isApproved(): boolean { return this.props.isApproved; }
    public get aiExtractedParameters(): string { return this.props.aiExtractedParameters; }
    public get line(): string | null | undefined { return this.props.line; }
    public get product(): string | null | undefined { return this.props.product; }
    public get createdAt(): Date | undefined { return this.props.createdAt; }
    public get updatedAt(): Date | undefined { return this.props.updatedAt; }

    public toJSON(): SopDocumentProps {
        return { ...this.props };
    }
}
