export interface ProjectProps {
    id?: string;
    title: string;
    description?: string | null;
    startDate: Date;
    endDate: Date;
    status: string; // PLANNING, IN_PROGRESS, COMPLETED
    progress: number;
    roi?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Project {
    private props: ProjectProps;

    constructor(props: ProjectProps) {
        if (!props.title || props.title.trim() === '') {
            throw new Error('Project title cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get title(): string { return this.props.title; }
    public get description(): string | null | undefined { return this.props.description; }
    public get startDate(): Date { return this.props.startDate; }
    public get endDate(): Date { return this.props.endDate; }
    public get status(): string { return this.props.status; }
    public get progress(): number { return this.props.progress; }
    public get roi(): number | null | undefined { return this.props.roi; }
    public get createdAt(): Date | undefined { return this.props.createdAt; }
    public get updatedAt(): Date | undefined { return this.props.updatedAt; }

    public toJSON(): ProjectProps {
        return { ...this.props };
    }
}
