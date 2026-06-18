export interface PreventiveScheduleProps {
    id?: string;
    taskTitle: string;
    description: string;
    frequency?: string;
    frequencyDays?: number;
    activities?: string;
    lastRunDate?: Date | null;
    nextDueDate: Date;
    assignedToId?: string | null;
    assetId: string;
}

export class PreventiveSchedule {
    private props: PreventiveScheduleProps;

    constructor(props: PreventiveScheduleProps) {
        if (!props.taskTitle || props.taskTitle.trim() === '') {
            throw new Error('PreventiveSchedule title cannot be empty');
        }
        if (!props.assetId) {
            throw new Error('PreventiveSchedule must belong to an Asset');
        }
        this.props = {
            ...props,
            frequency: props.frequency || 'MONTHLY',
            frequencyDays: props.frequencyDays !== undefined ? props.frequencyDays : 30,
            activities: props.activities || '[]'
        };
    }

    public get id(): string | undefined { return this.props.id; }
    public get taskTitle(): string { return this.props.taskTitle; }
    public get description(): string { return this.props.description; }
    public get frequency(): string { return this.props.frequency || 'MONTHLY'; }
    public get frequencyDays(): number { return this.props.frequencyDays || 30; }
    public get activities(): string { return this.props.activities || '[]'; }
    public get lastRunDate(): Date | null | undefined { return this.props.lastRunDate; }
    public get nextDueDate(): Date { return this.props.nextDueDate; }
    public get assignedToId(): string | null | undefined { return this.props.assignedToId; }
    public get assetId(): string { return this.props.assetId; }

    public run(runDate: Date): void {
        this.props.lastRunDate = runDate;
        
        // Calculate new nextDueDate
        const days = this.props.frequencyDays || 30;
        const newDueDate = new Date(runDate);
        newDueDate.setDate(newDueDate.getDate() + days);
        this.props.nextDueDate = newDueDate;
    }

    public updateDueDate(dueDate: Date): void {
        this.props.nextDueDate = dueDate;
    }

    public toJSON(): PreventiveScheduleProps {
        return { ...this.props };
    }
}
