import { PrismaClient, AssetStatus, AssetType, WorkOrderPriority, WorkOrderCategory, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('admin', 10);
    const userPassword = await bcrypt.hash('user', 10);

    // Initial Users
    const users = [
        {
            name: 'Mario Rossi',
            email: 'admin@cmms.it',
            password: password,
            role: 'ADMIN',
            image: '/avatars/mr.png',
        },
        {
            name: 'Luigi Bianchi',
            email: 'supervisor@cmms.it',
            password: userPassword,
            role: 'SUPERVISOR',
            image: '/avatars/lb.png',
        },
        // Technicians as Users
        {
            name: 'Luigi Verdi',
            email: 'tech.luigi@cmms.it',
            password: userPassword,
            role: 'MAINTAINER',
            image: '/avatars/default.png',
        },
        {
            name: 'Elena Bianchi',
            email: 'tech.elena@cmms.it',
            password: userPassword,
            role: 'MAINTAINER',
            image: '/avatars/default.png',
        },
        {
            name: 'Giulia Neri',
            email: 'tech.giulia@cmms.it',
            password: userPassword,
            role: 'MAINTAINER',
            image: '/avatars/default.png',
        },
        // Standard User
        {
            name: 'Giuseppe Verdi',
            email: 'user@cmms.it',
            password: userPassword,
            role: 'USER',
            image: '/avatars/gv.png',
        },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: user,
        });
    }

    // Create Technicians and Link to Users
    const technicians = [
        { name: 'Mario Rossi', specialty: 'Hydraulics', hourlyRate: 45, email: 'admin@cmms.it' },
        { name: 'Luigi Verdi', specialty: 'Electronics', hourlyRate: 50, email: 'tech.luigi@cmms.it' },
        { name: 'Elena Bianchi', specialty: 'Robotics', hourlyRate: 60, email: 'tech.elena@cmms.it' },
        { name: 'Giulia Neri', specialty: 'General', hourlyRate: 40, email: 'tech.giulia@cmms.it' },
    ];

    for (const tech of technicians) {
        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: tech.email }
        });

        if (user) {
            // Create or Update Technician linked to User
            const existing = await prisma.technician.findUnique({
                where: { userId: user.id }
            });

            if (!existing) {
                await prisma.technician.create({
                    data: {
                        name: tech.name,
                        specialty: tech.specialty,
                        hourlyRate: tech.hourlyRate,
                        userId: user.id
                    }
                });
            }
        }
    }

    // Create Assets
    const assets = [
        {
            id: 'AST-001',
            name: 'Hydraulic Press X200',
            model: 'HP-2000-v2',
            serialNumber: 'SN-8839201',
            vendor: 'HeavyInd Solutions',
            // plantId will be null for seed to pass typing
            department: 'Production',
            location: 'Sector 4',
            purchaseDate: new Date('2023-01-15'),
            status: AssetStatus.OPERATIONAL,
            healthScore: 85,
            lastMaintenance: new Date('2025-12-10'),
            type: AssetType.MACHINE
        },
        {
            id: 'AST-002',
            name: 'Conveyor Belt Motor',
            model: 'M-450-Turbo',
            serialNumber: 'SN-4421109',
            vendor: 'MotoTech S.p.A.',
            department: 'Logistics',
            location: 'Assembly Line 2',
            purchaseDate: new Date('2022-06-20'),
            status: AssetStatus.MAINTENANCE,
            healthScore: 45,
            lastMaintenance: new Date('2025-11-05'),
            type: AssetType.MACHINE
        },
        {
            id: 'AST-003',
            name: 'Robotic Arm KR-10',
            model: 'Kuka KR-10',
            serialNumber: 'KUK-99283',
            vendor: 'Robotics Daily',
            department: 'Assembly',
            location: 'Welding Station',
            purchaseDate: new Date('2024-03-10'),
            status: AssetStatus.OPERATIONAL,
            healthScore: 92,
            lastMaintenance: new Date('2025-12-28'),
            type: AssetType.MACHINE
        },
        {
            id: 'AST-004',
            name: 'Industrial chiller',
            model: 'Chill-Master 5000',
            serialNumber: 'CM-5000-001',
            vendor: 'CoolSys',
            department: 'Utilities',
            location: 'Utility Room',
            purchaseDate: new Date('2021-11-30'),
            status: AssetStatus.OFFLINE,
            healthScore: 60,
            lastMaintenance: new Date('2025-10-15'),
            type: AssetType.FACILITY
        },
        {
            id: 'AST-005',
            name: 'CNC Lathe',
            model: 'PrecisionCut 300',
            serialNumber: 'PC-300-X7',
            vendor: 'ToolMaster',
            department: 'Workshop',
            location: 'Workshop',
            purchaseDate: new Date('2023-08-22'),
            status: AssetStatus.OPERATIONAL,
            healthScore: 88,
            lastMaintenance: new Date('2025-12-01'),
            type: AssetType.MACHINE
        }
    ];

    for (const asset of assets) {
        await prisma.asset.upsert({
            where: { id: asset.id },
            update: {},
            create: asset,
        });
    }

    // Create Work Orders
    const workOrders = [
        {
            id: 'WO-1001',
            title: 'Hydraulic Press Maintenance',
            description: 'Quarterly fluid check and pressure valve inspection.',
            assetId: 'AST-001',
            priority: WorkOrderPriority.HIGH,
            category: WorkOrderCategory.HYDRAULIC,
            status: WorkOrderStatus.OPEN,
            assignedTo: 'Mario Rossi',
            dueDate: new Date('2026-01-05'),
            createdAt: new Date('2026-01-01'),
            type: WorkOrderType.ROUTINE,
            checklist: {
                create: [
                    { label: 'Check Fluid Levels', completed: false },
                    { label: 'Inspect Pressure Valve', completed: false }
                ]
            }
        },
        {
            id: 'WO-1002',
            title: 'Replace Conveyor Belt Sensor',
            description: 'Sensor #4 is giving erratic readings. Needs replacement.',
            assetId: 'AST-002',
            priority: WorkOrderPriority.MEDIUM,
            category: WorkOrderCategory.ELECTRICAL,
            status: WorkOrderStatus.IN_PROGRESS,
            assignedTo: 'Luigi Verdi',
            dueDate: new Date('2026-01-03'),
            createdAt: new Date('2025-12-30'),
            type: WorkOrderType.FAULT,
            checklist: {
                create: [
                    { label: 'Replace Sensor', completed: true },
                    { label: 'Calibrate Voltage', completed: false }
                ]
            }
        },
        {
            id: 'WO-1003',
            title: 'Robotic Arm Calibration',
            description: 'Recalibrate axis 3 and 4 after drift detection.',
            assetId: 'AST-003',
            priority: WorkOrderPriority.LOW,
            category: WorkOrderCategory.MECHANICAL,
            status: WorkOrderStatus.COMPLETED,
            assignedTo: 'Elena Bianchi',
            dueDate: new Date('2025-12-28'),
            createdAt: new Date('2025-12-25'),
            type: WorkOrderType.FAULT
        },
        {
            id: 'WO-1004',
            title: 'Hydraulic Seal Inspection',
            description: 'Routine check for leaks.',
            assetId: 'AST-003',
            priority: WorkOrderPriority.HIGH,
            category: WorkOrderCategory.HYDRAULIC,
            status: WorkOrderStatus.OPEN,
            assignedTo: 'Giulia Neri',
            dueDate: new Date('2026-01-02'),
            createdAt: new Date('2026-01-01'),
            type: WorkOrderType.ROUTINE,
            checklist: { create: [] }
        }
    ];

    for (const wo of workOrders) {
        await prisma.workOrder.upsert({
            where: { id: wo.id },
            update: {},
            create: wo
        })
    }

    console.log('Seed data and Schema relationships enabled.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
