"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ComponentType = 'SCREW' | 'BARREL';
export type WarehouseType = 'RETINATO' | 'MAGLIATO';
export type UsageType = 'SOTTOSTRATO' | 'COPERTURA' | 'JOLLY';
export type ComponentStatus = 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'NEEDS_NITRIDING' | 'NEEDS_REGENERATION' | 'TO_ORDER';

export interface Measurement {
    date: string;       // ISO Date
    value1: number;     // e.g. diameter A
    value2?: number;    // e.g. diameter B
    operator: string;   // Tech name
}

export interface ComponentLifecycle {
    nitriding1?: string;    // Date
    regeneration1?: string; // Date
    nitriding2?: string;
    regeneration2?: string;
    nitriding3?: string;
    regeneration3?: string;
}

export interface ComponentItem {
    id: string;
    code: string;       // Serial/Code
    type: ComponentType;
    model: string;      // e.g. "Ø50 25L/D"
    nominalDiameter?: number; // New field
    manufacturer: string;
    referenceDrawing?: string; // New field
    drawingUrl?: string; // PDF path
    usageType: UsageType;
    warehouse: WarehouseType;
    location: string;   // Specific shelf
    assignedAssetId?: string; // If mounted on asset
    status: ComponentStatus;
    measurements: Measurement[];
    lifecycle?: ComponentLifecycle; // New field
    isScrapped?: boolean; // New field
    hoursUsed?: number; // New field for usage tracking
    purchaseDate: string;
}

interface ComponentsContextType {
    components: ComponentItem[];
    addComponent: (item: Omit<ComponentItem, "id">) => void;
    updateComponent: (id: string, updates: Partial<ComponentItem>) => void;
    addMeasurement: (id: string, measurement: Measurement) => void;
    assignComponent: (componentId: string, assetId: string | undefined) => void;
    moveWarehouse: (id: string, warehouse: WarehouseType, location: string) => void;
}

const ComponentsContext = createContext<ComponentsContextType | undefined>(undefined);

// Mock Data
const MOCK_COMPONENTS: ComponentItem[] = [
    {
        id: 'C-101',
        code: 'VITE-050-A',
        type: 'SCREW',
        model: 'Vite Ø50mm PVC',
        nominalDiameter: 50,
        manufacturer: 'Bausano',
        usageType: 'SOTTOSTRATO',
        warehouse: 'RETINATO',
        location: 'Scaffale A1',
        status: 'OPTIMAL',
        referenceDrawing: 'DWG-2024-001',
        lifecycle: {},
        isScrapped: false,
        measurements: [{ date: '2024-01-01', value1: 49.95, operator: 'M. Rossi' }],
        purchaseDate: '2023-01-01',
    },
    {
        id: 'C-102',
        code: 'CIL-050-A',
        type: 'BARREL',
        model: 'Cilindro Ø50mm',
        nominalDiameter: 50,
        manufacturer: 'Bausano',
        usageType: 'COPERTURA',
        warehouse: 'MAGLIATO',
        location: 'Scaffale B2',
        status: 'WARNING',
        lifecycle: {
            nitriding1: '2023-01-15'
        },
        isScrapped: false,
        measurements: [{ date: '2023-06-01', value1: 50.05, operator: 'M. Rossi' }],
        purchaseDate: '2022-06-01',
        // assignedAssetId removed to make it available in warehouse
    }
];

export function ComponentsProvider({ children }: { children: React.ReactNode }) {
    const [components, setComponents] = useState<ComponentItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        refreshComponents();
    }, []);

    const refreshComponents = async () => {
        const { getComponents } = await import('@/lib/actions');
        // Type assertion needed as DB result might miss exact TS match or we need to map
        // ComponentItem has measurements, DB include measurements.
        // We might need to map dates if they are Date objects in DB but string in interface.
        const data = await getComponents();

        const mapped = data.map(d => ({
            ...d,
            type: d.type as ComponentType,
            usageType: d.usageType as UsageType,
            warehouse: d.warehouse as WarehouseType,
            status: d.status as ComponentStatus,
            purchaseDate: d.purchaseDate.toISOString(), // ComponentItem expects string usually? Interface says string.
            measurements: d.measurements.map((m: any) => ({
                date: m.date.toISOString(),
                value1: m.value1,
                value2: m.value2,
                operator: m.operator
            })),
            lifecycle: d.lifecycle as ComponentLifecycle // JSON object
        }));

        setComponents(mapped as ComponentItem[]);
        setIsLoaded(true);
    };

    const addComponent = async (item: Omit<ComponentItem, "id">) => {
        const { addComponent } = await import('@/lib/actions');
        // prepare data for DB
        const dbData = {
            ...item,
            purchaseDate: new Date(item.purchaseDate), // DB wants Date
            // measurements are not typically added via addComponent, or we ignore them initially
            measurements: undefined
        };
        const result = await addComponent(dbData);
        if (result.success) {
            refreshComponents(); // simpler to refresh than map especially with complex types
        } else {
            alert(result.message);
        }
    };

    const updateComponent = async (id: string, updates: Partial<ComponentItem>) => {
        const { updateComponent } = await import('@/lib/actions');
        // Map updates if needed (Date strings to Date objects)
        const dbUpdates: any = { ...updates };
        if (updates.purchaseDate) dbUpdates.purchaseDate = new Date(updates.purchaseDate);

        const result = await updateComponent(id, dbUpdates);
        if (result.success) {
            refreshComponents();
        } else {
            alert(result.message);
        }
    };

    const addMeasurement = async (id: string, measurement: Measurement) => {
        const { addMeasurement } = await import('@/lib/actions');
        const result = await addMeasurement(id, measurement);

        if (result.success) {
            // We can optimistically update or refresh. 
            // Since status logic WAS client side, we should probably keep it client side for immediate feedback 
            // OR move it to server. 
            // Ideally we move it to server action `addMeasurement`.
            // For now, let's refresh to get the standard behavior.
            refreshComponents();
        } else {
            alert(result.message);
        }
    };

    const assignComponent = async (componentId: string, assetId: string | undefined) => {
        const { updateComponent } = await import('@/lib/actions');
        const result = await updateComponent(componentId, { assignedAssetId: assetId || null }); // Prisma needs null not undefined usually
        if (result.success) refreshComponents();
    };

    const moveWarehouse = async (id: string, warehouse: WarehouseType, location: string) => {
        const { updateComponent } = await import('@/lib/actions');
        const result = await updateComponent(id, { warehouse, location });
        if (result.success) refreshComponents();
    };

    return (
        <ComponentsContext.Provider value={{ components, addComponent, updateComponent, addMeasurement, assignComponent, moveWarehouse }}>
            {children}
        </ComponentsContext.Provider>
    );
}

export function useComponents() {
    const context = useContext(ComponentsContext);
    if (!context) {
        throw new Error("useComponents must be used within a ComponentsProvider");
    }
    return context;
}
