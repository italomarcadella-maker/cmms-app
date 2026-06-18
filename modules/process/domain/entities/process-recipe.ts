export interface ProcessRecipeProps {
    id?: string;
    name: string;
    assetId?: string | null;
    image?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class ProcessRecipe {
    private props: ProcessRecipeProps;

    constructor(props: ProcessRecipeProps) {
        if (!props.name || props.name.trim() === '') {
            throw new Error('Recipe name cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get name(): string { return this.props.name; }
    public get assetId(): string | null | undefined { return this.props.assetId; }
    public get image(): string | null | undefined { return this.props.image; }
    public get createdAt(): Date | undefined { return this.props.createdAt; }
    public get updatedAt(): Date | undefined { return this.props.updatedAt; }

    public toJSON(): ProcessRecipeProps {
        return { ...this.props };
    }
}
