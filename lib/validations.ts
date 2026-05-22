import { z } from "zod";

// --- Asset Validation ---
export const assetSchema = z.object({
    name: z.string().min(1, "Il nome è obbligatorio"),
    model: z.string().min(1, "Il modello è obbligatorio"),
    serialNumber: z.string().min(1, "Il seriale è obbligatorio"),
    location: z.string().min(1, "La posizione è obbligatoria"),
    type: z.enum(["MACHINE", "FACILITY", "SAFETY", "KAIZEN", "OTHER"]).default("MACHINE"),
    status: z.enum(["OPERATIONAL", "MAINTENANCE", "OFFLINE", "DECOMMISSIONED", "STORAGE"]).default("OPERATIONAL"),
    plant: z.string().optional(),
    department: z.string().optional(),
    line: z.string().optional().nullable(),
    cespite: z.string().optional().nullable(),
    vendor: z.string().optional(),
    purchaseDate: z.any().transform((val) => {
        const date = new Date(val);
        return isNaN(date.getTime()) ? new Date() : date;
    }),
    healthScore: z.coerce.number().min(0).max(100).default(100),
});

// --- Work Order Validation ---
export const workOrderSchema = z.object({
    title: z.string().min(3, "Il titolo deve avere almeno 3 caratteri"),
    description: z.string().min(1, "La descrizione è obbligatoria"),
    assetId: z.string().min(1, "L'asset è obbligatorio"),
    priority: z.enum(["STOPPED", "MALFUNCTIONING", "WORKING", "NOT_PRODUCTION", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
    category: z.enum(["MECHANICAL", "ELECTRICAL", "HYDRAULIC", "PNEUMATIC", "OTHER", "AI_SUGGESTION", "SAFETY", "IMPROVEMENT"]).default("OTHER"),
    status: z.enum(["OPEN", "PENDING_APPROVAL", "APPROVED", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "PENDING_REVIEW", "COMPLETED", "CLOSED", "CANCELED"]).default("OPEN"),
    type: z.enum(["FAULT", "ROUTINE", "REQUEST"]).default("FAULT"),
    dueDate: z.string().or(z.date()).optional().nullable().transform((val) => val ? new Date(val) : null),

    // Optional relations IDs
    requesterId: z.string().optional().nullable().transform(val => val || null),
    validatedById: z.string().optional().nullable().transform(val => val || null),
    assignedTechnicianId: z.string().optional().nullable().transform(val => val || null),
    plantId: z.string().optional().nullable().transform(val => val || null),

    // Nested structures might be handled separately or passed as JSON, 
    // but if passed in the body we can validate basic structure
    checklist: z.array(z.object({
        label: z.string(),
        completed: z.boolean().default(false)
    })).optional().default([]),
});

export type CreateAssetInput = z.infer<typeof assetSchema>;
export type CreateWorkOrderInput = z.infer<typeof workOrderSchema>;
