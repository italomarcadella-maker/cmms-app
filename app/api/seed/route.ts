import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return NextResponse.json({ message: "Database già popolato. Nessuna azione necessaria." });
        }

        const password = await bcrypt.hash('admin', 10);
        const userPassword = await bcrypt.hash('user', 10);

        // 1. Create Plants First
        const plantA = await prisma.plant.upsert({
            where: { name: 'Turin Plant A' },
            update: {},
            create: { name: 'Turin Plant A', location: 'Turin, IT', country: 'IT' }
        });

        const plantB = await prisma.plant.upsert({
            where: { name: 'Milan Plant B' },
            update: {},
            create: { name: 'Milan Plant B', location: 'Milan, IT', country: 'IT' }
        });

        const users = [
            {
                name: 'Mario Rossi',
                email: 'admin@cmms.it',
                password: password,
                role: 'ADMIN',
                image: '',
                plantId: plantA.id
            },
            {
                name: 'Luigi Bianchi',
                email: 'supervisor@cmms.it',
                password: userPassword,
                role: 'SUPERVISOR',
                image: '',
                plantId: plantA.id
            },
            {
                name: 'Giuseppe Verdi',
                email: 'user@cmms.it',
                password: userPassword,
                role: 'USER',
                image: '',
                plantId: plantA.id
            },
            {
                name: 'Tecnico Manutentore',
                email: 'tech@cmms.it',
                password: userPassword,
                role: 'MAINTAINER',
                image: '',
                plantId: plantA.id
            }
        ];

        for (const user of users) {
            await prisma.user.create({
                data: user,
            });
        }

        // Create Technicians linked to Users
        // We match them by name for simplicity in this seed script
        const createdUsers = await prisma.user.findMany();

        // Map of name -> userId
        const userMap = new Map(createdUsers.map(u => [u.name, u.id]));

        const technicians = [
            { name: 'Mario Rossi', specialty: 'Hydraulics', hourlyRate: 45 },
            { name: 'Luigi Bianchi', specialty: 'Supervisor (Tech)', hourlyRate: 55 }, // Mapped to Supervisor for demo
            { name: 'Giuseppe Verdi', specialty: 'General', hourlyRate: 40 },
            // Tech/Maintainer user logic: 'Tecnico Manutentore' -> 'Tech Mike'
        ];

        // Specific mapping for the 'Tecnico Manutentore' user to a technician profile
        const techUser = createdUsers.find(u => u.email === 'tech@cmms.it');
        if (techUser) {
            await prisma.technician.create({
                data: {
                    name: techUser.name || 'Tecnico Manutentore',
                    specialty: 'General Maintenance',
                    hourlyRate: 35,
                    userId: techUser.id
                }
            });
        }

        // Also map Mario Rossi (Admin) as a tech for testing assignments
        const adminUser = createdUsers.find(u => u.email === 'admin@cmms.it');
        if (adminUser) {
            await prisma.technician.create({
                data: {
                    name: 'Mario Rossi',
                    specialty: 'Master Technician',
                    hourlyRate: 60,
                    userId: adminUser.id
                }
            });
        }

        // Create Assets
        const assets = [
            {
                id: 'AST-001',
                name: 'Hydraulic Press X200',
                model: 'HP-2000-v2',
                serialNumber: 'SN-8839201',
                vendor: 'HeavyInd Solutions',
                plantId: plantA.id,
                department: 'Production',
                location: 'Sector 4',
                purchaseDate: new Date('2023-01-15'),
                status: 'OPERATIONAL' as const,
                healthScore: 85,
                lastMaintenance: new Date('2025-12-10'),
            },
            {
                id: 'AST-002',
                name: 'Conveyor Belt Motor',
                model: 'M-450-Turbo',
                serialNumber: 'SN-4421109',
                vendor: 'MotoTech S.p.A.',
                plantId: plantA.id,
                department: 'Logistics',
                location: 'Assembly Line 2',
                purchaseDate: new Date('2022-06-20'),
                status: 'MAINTENANCE' as const,
                healthScore: 45,
                lastMaintenance: new Date('2025-11-05'),
            },
            {
                id: 'AST-003',
                name: 'Robotic Arm KR-10',
                model: 'Kuka KR-10',
                serialNumber: 'KUK-99283',
                vendor: 'Robotics Daily',
                plantId: plantB.id,
                department: 'Assembly',
                location: 'Welding Station',
                purchaseDate: new Date('2024-03-10'),
                status: 'OPERATIONAL' as const,
                healthScore: 92,
                lastMaintenance: new Date('2025-12-28'),
            },
            {
                id: 'AST-004',
                name: 'Industrial chiller',
                model: 'Chill-Master 5000',
                serialNumber: 'CM-5000-001',
                vendor: 'CoolSys',
                plantId: plantB.id,
                department: 'Utilities',
                location: 'Utility Room',
                purchaseDate: new Date('2021-11-30'),
                status: 'OFFLINE' as const,
                healthScore: 60,
                lastMaintenance: new Date('2025-10-15'),
            },
            {
                id: 'AST-005',
                name: 'CNC Lathe',
                model: 'PrecisionCut 300',
                serialNumber: 'PC-300-X7',
                vendor: 'ToolMaster',
                plantId: plantA.id,
                department: 'Workshop',
                location: 'Workshop',
                purchaseDate: new Date('2023-08-22'),
                status: 'OPERATIONAL' as const,
                healthScore: 88,
                lastMaintenance: new Date('2025-12-01'),
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
                priority: 'HIGH',
                category: 'HYDRAULIC',
                status: 'OPEN',
                assignedTo: 'Mario Rossi',
                plantId: plantA.id,
                dueDate: new Date('2026-01-05'),
                createdAt: new Date('2026-01-01'),
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
                priority: 'MEDIUM',
                category: 'ELECTRICAL',
                status: 'IN_PROGRESS',
                assignedTo: 'Luigi Verdi',
                plantId: plantA.id,
                dueDate: new Date('2026-01-03'),
                createdAt: new Date('2025-12-30'),
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
                priority: 'LOW',
                category: 'MECHANICAL',
                status: 'COMPLETED',
                assignedTo: 'Elena Bianchi',
                plantId: plantB.id,
                dueDate: new Date('2025-12-28'),
                createdAt: new Date('2025-12-25'),
            }
        ];

        for (const wo of workOrders) {
            await prisma.workOrder.upsert({
                where: { id: wo.id },
                update: {},
                create: wo as any
            })
        }

        return NextResponse.json({ success: true, message: "Database seeded successfully", users: users.map(u => ({ email: u.email, role: u.role })) });
    } catch (error: any) {
        console.error("Seeding error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
