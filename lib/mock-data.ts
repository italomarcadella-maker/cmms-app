import { Asset } from './types';

export const mockAssets: Asset[] = [
    {
        id: 'AST-001',
        name: 'Hydraulic Press X200',
        model: 'HP-2000-v2',
        serialNumber: 'SN-8839201',
        vendor: 'HeavyInd Solutions',
        plant: 'Turin Plant A',
        department: 'Production',
        location: 'Sector 4',
        purchaseDate: '2023-01-15',
        status: 'OPERATIONAL',
        healthScore: 85,
        documents: [
            { name: 'User Manual v2.0', url: '#', type: 'MANUAL' },
            { name: 'Hydraulic Schematic 2023', url: '#', type: 'SCHEMATIC' }
        ],
        lastMaintenance: '2025-12-10',
    },
    {
        id: 'AST-002',
        name: 'Conveyor Belt Motor',
        model: 'M-450-Turbo',
        serialNumber: 'SN-4421109',
        vendor: 'MotoTech S.p.A.',
        plant: 'Turin Plant A',
        department: 'Logistics',
        location: 'Assembly Line 2',
        purchaseDate: '2022-06-20',
        status: 'MAINTENANCE',
        healthScore: 45,
        lastMaintenance: '2025-11-05',
    },
    {
        id: 'AST-003',
        name: 'Robotic Arm KR-10',
        model: 'Kuka KR-10',
        serialNumber: 'KUK-99283',
        vendor: 'Robotics Daily',
        plant: 'Milan Plant B',
        department: 'Assembly',
        location: 'Welding Station',
        purchaseDate: '2024-03-10',
        status: 'OPERATIONAL',
        healthScore: 92,
        lastMaintenance: '2025-12-28',
    },
    {
        id: 'AST-004',
        name: 'Industrial chiller',
        model: 'Chill-Master 5000',
        serialNumber: 'CM-5000-001',
        vendor: 'CoolSys',
        plant: 'Milan Plant B',
        department: 'Utilities',
        location: 'Utility Room',
        purchaseDate: '2021-11-30',
        status: 'OFFLINE',
        healthScore: 60,
        documents: [
            { name: 'Motor Specs', url: '#', type: 'PDF' }
        ],
        lastMaintenance: '2025-10-15',
    },
    {
        id: 'AST-005',
        name: 'CNC Lathe',
        model: 'PrecisionCut 300',
        serialNumber: 'PC-300-X7',
        vendor: 'ToolMaster',
        plant: 'Turin Plant A',
        department: 'Workshop',
        location: 'Workshop',
        purchaseDate: '2023-08-22',
        status: 'OPERATIONAL',
        healthScore: 88,
        lastMaintenance: '2025-12-01',
    }
];

export const mockWorkOrders: import('./types').WorkOrder[] = [
    {
        id: 'WO-1001',
        title: 'Hydraulic Press Maintenance',
        description: 'Quarterly fluid check and pressure valve inspection.',
        assetId: 'AST-001',
        assetName: 'Hydraulic Press X200',
        priority: 'HIGH',
        category: 'HYDRAULIC',
        status: 'OPEN',
        assignedTo: 'Mario Rossi',
        dueDate: '2026-01-05',
        createdAt: '2026-01-01',
        partsUsed: [],
        laborLogs: [],
        checklist: [
            { id: 'CHK-1', label: 'Check Fluid Levels', completed: false },
            { id: 'CHK-2', label: 'Inspect Pressure Valve', completed: false }
        ]
    },
    {
        id: 'WO-1002',
        title: 'Replace Conveyor Belt Sensor',
        description: 'Sensor #4 is giving erratic readings. Needs replacement.',
        assetId: 'AST-002',
        assetName: 'Conveyor Belt Motor',
        priority: 'MEDIUM',
        category: 'ELECTRICAL',
        status: 'IN_PROGRESS',
        assignedTo: 'Luigi Verdi',
        dueDate: '2026-01-03',
        createdAt: '2025-12-30',
        partsUsed: [],
        laborLogs: [],
        checklist: [
            { id: 'CHK-3', label: 'Replace Sensor', completed: true },
            { id: 'CHK-4', label: 'Calibrate Voltage', completed: false }
        ]
    },
    {
        id: 'WO-1003',
        title: 'Robotic Arm Calibration',
        description: 'Recalibrate axis 3 and 4 after drift detection.',
        assetId: 'AST-003',
        assetName: 'Robotic Arm KR-10',
        priority: 'LOW',
        category: 'MECHANICAL',
        status: 'COMPLETED',
        assignedTo: 'Elena Bianchi',
        dueDate: '2025-12-28',
        createdAt: '2025-12-25',
        partsUsed: [],
        laborLogs: [],
        checklist: []
    },
    {
        id: 'WO-1004',
        title: 'Hydraulic Seal Inspection',
        description: 'Routine check for leaks.',
        assetId: 'AST-003',
        assetName: 'Hydraulic Press',
        priority: 'HIGH',
        category: 'HYDRAULIC',
        status: 'OPEN',
        assignedTo: 'Giulia Neri',
        dueDate: '2026-01-02',
        createdAt: '2026-01-01',
        partsUsed: [],
        laborLogs: [],
        checklist: []
    }
];

export const mockTechnicians: import('./types').Technician[] = [
    { id: 'T-001', name: 'Mario Rossi', specialty: 'Hydraulics', hourlyRate: 45 },
    { id: 'T-002', name: 'Luigi Verdi', specialty: 'Electronics', hourlyRate: 50 },
    { id: 'T-003', name: 'Elena Bianchi', specialty: 'Robotics', hourlyRate: 60 },
    { id: 'T-004', name: 'Giulia Neri', specialty: 'General', hourlyRate: 40 },
];

export const mockActivities: import('./types').MaintenanceActivity[] = [
    { id: 'ACT-001', label: 'Quarterly Maintenance' },
    { id: 'ACT-002', label: 'Oil Change' },
    { id: 'ACT-003', label: 'Sensor Calibration' },
    { id: 'ACT-004', label: 'Leak Inspection' },
    { id: 'ACT-005', label: 'Component Replacement' },
];
