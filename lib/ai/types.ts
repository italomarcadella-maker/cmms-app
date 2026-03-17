
export interface AIContext {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIIntent {
    id: string; // e.g. 'create_ticket', 'status_check'
    confidence: number;
    parameters: Record<string, any>;
}

export interface AIMemoryItem {
    id: string;
    tags: string[];
    content: string;
    type: 'knowledge' | 'history' | 'manual' | 'process' | 'energy' | 'safety';
    createdAt: Date;
    relevance?: number;
}

export interface AICortexResponse {
    message: string;
    thoughtProcess?: string[]; // "Thinking" steps
    actions?: AIAction[];
}

export interface AIAction {
    label: string;
    value: string;
    payload?: any;
}

export interface DailyInsight {
    id: string;
    type: 'ALERT' | 'WARNING' | 'INFO' | 'SUCCESS';
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
}
