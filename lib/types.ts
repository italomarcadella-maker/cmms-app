
export type AssetStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE' | 'DECOMMISSIONED' | 'STORAGE';

export interface Asset {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    vendor: string;      // Requested by user
    plant: string;       // Requested by user
    department: string;  // For KPIs
    line?: string;       // Requested by user (Linea)
    cespite?: string;    // Requested by user (Cespite)
    location: string;    // specific room/area within plant
    purchaseDate: string;
    status: AssetStatus;
    image?: string;
    healthScore: number; // 0-100
    documents?: {
        name: string;
        url: string;
        type: string; // Relaxed from union to string to allow user input
        date?: string; // Added date field
    }[];
    lastMaintenance: string;
}

export type WorkOrderPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type WorkOrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED' | 'CANCELED';
export type WorkOrderCategory = 'MECHANICAL' | 'ELECTRICAL' | 'HYDRAULIC' | 'PNEUMATIC' | 'OTHER' | 'AI_SUGGESTION';

export interface ChecklistItem {
    id: string;
    label: string;
    completed: boolean;
}

export interface WorkOrder {
    id: string;
    title: string;
    description: string;
    assetId: string;
    assetName: string; // Denormalized for display convenience
    priority: WorkOrderPriority;
    category: WorkOrderCategory;
    status: WorkOrderStatus;
    assignedTo: string; // Legacy string field, might remain for display
    assignedTechnicianId?: string; // ID linking to Technician
    dueDate: string | null;
    createdAt: string;
    checklist: ChecklistItem[];
    partsUsed: {
        partId: string;
        partName: string;
        quantity: number;
        unitCost: number;
        dateAdded: string;
    }[];
    laborLogs: {
        id: string;
        technicianId: string;
        technicianName: string;
        hours: number;
        date: string;
    }[];
    requesterId?: string;
    validatedById?: string;
    type?: 'FAULT' | 'ROUTINE' | 'REQUEST';
    requestImage?: string;
    completionImage?: string;
    originScheduleId?: string;
    timers?: WorkOrderTimer[];
}

export interface WorkOrderTimer {
    id: string;
    workOrderId: string;
    userId: string;
    startTime: string;
    endTime: string | null;
    duration: number | null;
    note: string | null;
}

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'MAINTAINER' | 'USER';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    isActive: boolean;
    lastLogin?: string;
    department?: string;
}

export interface Technician {
    id: string;
    name: string;
    specialty: string;
    hourlyRate: number; // Added
}

export interface MaintenanceActivity {
    id: string;
    label: string;
    category?: string;
}

export interface PreventiveSchedule {
    id: string;
    assetId: string;
    assetName: string;
    taskTitle: string;
    description: string;
    frequencyDays: number; // Legacy or computed
    frequency: string; // 'WEEKLY', 'MONTHLY', etc.
    activities: { id: string; label: string }[]; // Updated from database JSON
    lastRunDate: string | null;
    nextDueDate: string;
    assignedToId?: string;
}

export const RECURRENCE_OPTIONS = [
    { value: 'WEEKLY', label: 'Settimanale (7 gg)', days: 7 },
    { value: 'MONTHLY', label: 'Mensile (30 gg)', days: 30 },
    { value: 'BIMONTHLY', label: 'Bimestrale (60 gg)', days: 60 },
    { value: 'QUARTERLY', label: 'Trimestrale (90 gg)', days: 90 },
    { value: 'SEMIANNUAL', label: 'Semestrale (180 gg)', days: 180 },
    { value: 'ANNUAL', label: 'Annuale (365 gg)', days: 365 },
];

export interface SparePart {
    id: string;
    name: string;
    category: string;
    // warehouse: string; // Removed as not in DB
    quantity: number;
    minQuantity: number;
    location: string;
    unitCost?: number;
    lastUpdated: string;
}
