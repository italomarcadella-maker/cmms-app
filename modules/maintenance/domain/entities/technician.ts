export interface TechnicianProps {
    id?: string;
    name: string;
    specialty: string;
    hourlyRate: number;
    skills?: string[];
    userId: string;
}

export class Technician {
    private props: TechnicianProps;

    constructor(props: TechnicianProps) {
        if (!props.name || props.name.trim() === '') {
            throw new Error('Technician name cannot be empty');
        }
        if (!props.userId) {
            throw new Error('Technician must be linked to a User');
        }
        this.props = {
            ...props,
            skills: props.skills || []
        };
    }

    public get id(): string | undefined { return this.props.id; }
    public get name(): string { return this.props.name; }
    public get specialty(): string { return this.props.specialty; }
    public get hourlyRate(): number { return this.props.hourlyRate; }
    public get skills(): string[] { return this.props.skills || []; }
    public get userId(): string { return this.props.userId; }

    public toJSON(): TechnicianProps {
        return { ...this.props };
    }
}
