
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
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'ON_HOLD';
export type WorkOrderCategory = 'MECHANICAL' | 'ELECTRICAL' | 'HYDRAULIC' | 'PNEUMATIC' | 'OTHER';

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
    dueDate: string;
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
}

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'USER';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
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
    frequencyDays: number;
    lastRunDate: string; // ISO Date
    nextDueDate: string; // ISO Date
    assignedToId?: string; // Optional default technician
}

export interface SparePart {
    id: string;
    name: string;
    category: string;
    warehouse: string; // New field requested
    quantity: number;
    minQuantity: number;
    location: string;
    unitCost?: number;
    lastUpdated: string;
}
