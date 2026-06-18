export interface ProjectTaskProps {
    id?: string;
    projectId: string;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string; // TODO, IN_PROGRESS, DONE
    dependencies?: string | null;
    linkedWorkOrderId?: string | null;
}

export class ProjectTask {
    private props: ProjectTaskProps;

    constructor(props: ProjectTaskProps) {
        if (!props.title || props.title.trim() === '') {
            throw new Error('Task title cannot be empty');
        }
        this.props = { ...props };
    }

    public get id(): string | undefined { return this.props.id; }
    public get projectId(): string { return this.props.projectId; }
    public get title(): string { return this.props.title; }
    public get startDate(): Date { return this.props.startDate; }
    public get endDate(): Date { return this.props.endDate; }
    public get status(): string { return this.props.status; }
    public get dependencies(): string | null | undefined { return this.props.dependencies; }
    public get linkedWorkOrderId(): string | null | undefined { return this.props.linkedWorkOrderId; }

    public toJSON(): ProjectTaskProps {
        return { ...this.props };
    }
}
