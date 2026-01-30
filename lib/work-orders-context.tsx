"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { WorkOrder } from "@/lib/types";
import { updateWorkOrderStatus as updateStatusAction, createWorkOrder as createAction } from "@/lib/actions";

interface WorkOrdersContextType {
    workOrders: WorkOrder[];
    addWorkOrder: (workOrder: WorkOrder) => Promise<void>;
    updateWorkOrderStatus: (id: string, status: WorkOrder["status"]) => Promise<void>;
    updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => Promise<void>;
    deleteWorkOrder: (id: string) => Promise<void>;
    refreshWorkOrders: () => Promise<void>;
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

    const refreshWorkOrders = async () => {
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

    // Load from Server on mount
    useEffect(() => {
        refreshWorkOrders();
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
        } catch (err) {
            console.error("Failed to create work order", err);
            // Revert on failure
            setWorkOrders((prev) => prev.filter(w => w.id !== workOrder.id));
            alert("Errore salvataggio ordine: " + err);
        }
    };

    const deleteWorkOrder = async (id: string) => {
        const { deleteWorkOrder } = await import('@/lib/actions');
        try {
            const res = await deleteWorkOrder(id);
            if (res.success) {
                setWorkOrders(prev => prev.filter(wo => wo.id !== id));
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert("Errore eliminazione");
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

    const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
        setWorkOrders((prev) => prev.map(wo => wo.id === id ? { ...wo, ...updates } : wo));

        try {
            const { updateWorkOrderDetails } = await import('@/lib/actions');
            await updateWorkOrderDetails(id, updates);
        } catch (err) {
            console.error("Failed to persist WO update", err);
        }
    };

    return (
        <WorkOrdersContext.Provider value={{ workOrders, addWorkOrder, updateWorkOrderStatus, updateWorkOrder, deleteWorkOrder, refreshWorkOrders }}>
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
