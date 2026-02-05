-- USERS
INSERT INTO "User" (id, name, email, password, role, "isActive", "mustChangePassword") VALUES
('user-1', 'Mario Rossi', 'admin@cmms.it', '$2b$10$XL62FaygoZrFKvZDTzE7Ou41dboda/6if3e0/S44W8bcYo3EvLbkq', 'ADMIN', true, false),
('user-2', 'Luigi Bianchi', 'supervisor@cmms.it', '$2b$10$gMObhitvhFAm03Qt2n0Oj.JwueRiNOSv7/F6mdYeNZ3rNP/ff2XF2', 'SUPERVISOR', true, false),
('user-3', 'Luigi Verdi', 'tech.luigi@cmms.it', '$2b$10$gMObhitvhFAm03Qt2n0Oj.JwueRiNOSv7/F6mdYeNZ3rNP/ff2XF2', 'MAINTAINER', true, false),
('user-4', 'Elena Bianchi', 'tech.elena@cmms.it', '$2b$10$gMObhitvhFAm03Qt2n0Oj.JwueRiNOSv7/F6mdYeNZ3rNP/ff2XF2', 'MAINTAINER', true, false),
('user-5', 'Giulia Neri', 'tech.giulia@cmms.it', '$2b$10$gMObhitvhFAm03Qt2n0Oj.JwueRiNOSv7/F6mdYeNZ3rNP/ff2XF2', 'MAINTAINER', true, false),
('user-6', 'Giuseppe Verdi', 'user@cmms.it', '$2b$10$gMObhitvhFAm03Qt2n0Oj.JwueRiNOSv7/F6mdYeNZ3rNP/ff2XF2', 'USER', true, false);

-- TECHNICIANS
INSERT INTO "Technician" (id, name, specialty, "hourlyRate", "userId") VALUES
('tech-1', 'Mario Rossi', 'Hydraulics', 45, 'user-1'),
('tech-2', 'Luigi Verdi', 'Electronics', 50, 'user-3'),
('tech-3', 'Elena Bianchi', 'Robotics', 60, 'user-4'),
('tech-4', 'Giulia Neri', 'General', 40, 'user-5');

-- ASSETS
INSERT INTO "Asset" (id, name, model, "serialNumber", vendor, plant, department, location, "purchaseDate", status, "healthScore", "lastMaintenance") VALUES
('AST-001', 'Hydraulic Press X200', 'HP-2000-v2', 'SN-8839201', 'HeavyInd Solutions', 'Turin Plant A', 'Production', 'Sector 4', '2023-01-15', 'OPERATIONAL', 85, '2025-12-10'),
('AST-002', 'Conveyor Belt Motor', 'M-450-Turbo', 'SN-4421109', 'MotoTech S.p.A.', 'Turin Plant A', 'Logistics', 'Assembly Line 2', '2022-06-20', 'MAINTENANCE', 45, '2025-11-05'),
('AST-003', 'Robotic Arm KR-10', 'Kuka KR-10', 'KUK-99283', 'Robotics Daily', 'Milan Plant B', 'Assembly', 'Welding Station', '2024-03-10', 'OPERATIONAL', 92, '2025-12-28'),
('AST-004', 'Industrial chiller', 'Chill-Master 5000', 'CM-5000-001', 'CoolSys', 'Milan Plant B', 'Utilities', 'Utility Room', '2021-11-30', 'OFFLINE', 60, '2025-10-15'),
('AST-005', 'CNC Lathe', 'PrecisionCut 300', 'PC-300-X7', 'ToolMaster', 'Turin Plant A', 'Workshop', 'Workshop', '2023-08-22', 'OPERATIONAL', 88, '2025-12-01');

-- WORK ORDERS
INSERT INTO "WorkOrder" (id, title, description, "assetId", priority, category, status, "assignedTo", "assignedTechnicianId", "dueDate", "createdAt") VALUES
('WO-1001', 'Hydraulic Press Maintenance', 'Quarterly fluid check and pressure valve inspection.', 'AST-001', 'HIGH', 'HYDRAULIC', 'OPEN', 'Mario Rossi', 'tech-1', '2026-01-05', '2026-01-01'),
('WO-1002', 'Replace Conveyor Belt Sensor', 'Sensor #4 is giving erratic readings. Needs replacement.', 'AST-002', 'MEDIUM', 'ELECTRICAL', 'IN_PROGRESS', 'Luigi Verdi', 'tech-2', '2026-01-03', '2025-12-30'),
('WO-1003', 'Robotic Arm Calibration', 'Recalibrate axis 3 and 4 after drift detection.', 'AST-003', 'LOW', 'MECHANICAL', 'COMPLETED', 'Elena Bianchi', 'tech-3', '2025-12-28', '2025-12-25'),
('WO-1004', 'Hydraulic Seal Inspection', 'Routine check for leaks.', 'AST-003', 'HIGH', 'HYDRAULIC', 'OPEN', 'Giulia Neri', 'tech-4', '2026-01-02', '2026-01-01');

-- CHECKLIST ITEMS
INSERT INTO "ChecklistItem" (id, label, completed, "workOrderId") VALUES
('cli-1', 'Check Fluid Levels', false, 'WO-1001'),
('cli-2', 'Inspect Pressure Valve', false, 'WO-1001'),
('cli-3', 'Replace Sensor', true, 'WO-1002'),
('cli-4', 'Calibrate Voltage', false, 'WO-1002');
