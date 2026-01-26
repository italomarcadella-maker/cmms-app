"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { WorkOrder } from "@/lib/types";
import { updateWorkOrderStatus as updateStatusAction, createWorkOrder as createAction } from "@/lib/actions";

interface WorkOrdersContextType {
    workOrders: WorkOrder[];
    addWorkOrder: (workOrder: WorkOrder) => Promise<void>;
    updateWorkOrderStatus: (id: string, status: WorkOrder["status"]) => Promise<void>;
    updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void;
}

const WorkOrdersContext = createContext<WorkOrdersContextType | undefined>(undefined);

export function WorkOrdersProvider({
    children,
    initialWorkOrders = []
}: {
    children: React.ReactNode;
    initialWorkOrders?: WorkOrder[];
}) {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);

    // Load from Server on mount
    useEffect(() => {
        const load = async () => {
            const { getWorkOrders } = await import('@/lib/actions');
            const data = await getWorkOrders();

            // Map DB result to Frontend Type
            const mapped = data.map(wo => ({
                ...wo,
                // Dates are already strings from server action
                assetName: (wo as any).asset?.name || 'Unknown',
            }));
            setWorkOrders(mapped as WorkOrder[]);
        };
        load();
    }, []);

    const addWorkOrder = async (workOrder: WorkOrder) => {
        // Optimistic update
        setWorkOrders((prev) => [workOrder, ...prev]);

        try {
            // Dynamic import to avoid build time circular deps if any
            const { createWorkOrder } = await import('@/lib/actions');

            // Pass the workOrder object. The action handles validation/cleanup.
            const res = await createWorkOrder(workOrder);

            if (!res.success) {
                throw new Error(res.message);
            }
            // Ideally replace optimistic ID with real DB ID if different, but for now strict consistency:
            // reload or just trust optimistic if we match IDs.
            // Since we let DB gen ID, we should really update the local state with the returned real data.
            // But doing so might jump the UI.
        } catch (err) {
            console.error("Failed to create work order", err);
            // Revert on failure
            setWorkOrders((prev) => prev.filter(w => w.id !== workOrder.id));
            alert("Errore salvataggio ordine: " + err);
        }
    };

    const updateWorkOrderStatus = async (id: string, status: WorkOrder["status"]) => {
        setWorkOrders((prev) => prev.map(wo => wo.id === id ? { ...wo, status } : wo));
        try {
            await updateStatusAction(id, status);
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const updateWorkOrder = (id: string, updates: Partial<WorkOrder>) => {
        setWorkOrders((prev) => prev.map(wo => wo.id === id ? { ...wo, ...updates } : wo));
        // TODO: Implement updateWorkOrder server action if needed for other fields
    };

    return (
        <WorkOrdersContext.Provider value={{ workOrders, addWorkOrder, updateWorkOrderStatus, updateWorkOrder }}>
            {children}
        </WorkOrdersContext.Provider>
    );
}

export function useWorkOrders() {
    const context = useContext(WorkOrdersContext);
    if (context === undefined) {
        throw new Error("useWorkOrders must be used within a WorkOrdersProvider");
    }
    return context;
}
