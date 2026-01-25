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
        const saved = localStorage.getItem('components-db');
        if (saved) {
            try {
                setComponents(JSON.parse(saved));
            } catch (e) {
                setComponents(MOCK_COMPONENTS);
            }
        } else {
            setComponents(MOCK_COMPONENTS);
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('components-db', JSON.stringify(components));
        }
    }, [components, isLoaded]);

    const addComponent = (item: Omit<ComponentItem, "id">) => {
        const newItem = { ...item, id: `C-${Date.now()}` };
        setComponents(prev => [...prev, newItem]);
    };

    const updateComponent = (id: string, updates: Partial<ComponentItem>) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const addMeasurement = (id: string, measurement: Measurement) => {
        setComponents(prev => prev.map(c => {
            if (c.id !== id) return c;

            // Calculate Status based on Nominal Diameter
            const nominal = c.nominalDiameter || 0;
            const current = measurement.value1;
            const diff = nominal - current; // Wear is positive (e.g. 50 - 49.5 = 0.5)

            let newStatus: ComponentStatus = 'OPTIMAL';

            if (nominal > 0) {
                if (c.type === 'BARREL') {
                    // BARREL Logic
                    if (diff < 0.7) {
                        newStatus = 'OPTIMAL';
                    } else if (diff >= 0.7 && diff <= 0.8) {
                        newStatus = 'TO_ORDER';
                    } else if (diff > 0.8) {
                        newStatus = 'CRITICAL'; // Should be Scrapped
                    }
                } else {
                    // SCREW Logic
                    if (diff < 0.4) {
                        newStatus = 'OPTIMAL';
                    } else if (diff >= 0.4 && diff < 0.5) {
                        newStatus = 'WARNING';
                    } else if (diff >= 0.5 && diff <= 0.6) {
                        newStatus = 'NEEDS_NITRIDING';
                    } else if (diff > 0.6 && diff <= 1.0) {
                        newStatus = 'NEEDS_REGENERATION';
                    } else if (diff > 1.0) {
                        newStatus = 'CRITICAL'; // Should be Scrapped
                    }
                }
            } else {
                // Fallback if no nominal set
                if (measurement.value1 < 49.0 || measurement.value1 > 51.0) newStatus = 'CRITICAL';
                else newStatus = 'OPTIMAL';
            }

            return {
                ...c,
                measurements: [...c.measurements, measurement],
                status: newStatus
            };
        }));
    };

    const assignComponent = (componentId: string, assetId: string | undefined) => {
        setComponents(prev => prev.map(c => c.id === componentId ? { ...c, assignedAssetId: assetId } : c));
    };

    const moveWarehouse = (id: string, warehouse: WarehouseType, location: string) => {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, warehouse, location } : c));
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
