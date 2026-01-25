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

    // Sync with initialWorkOrders if they change (re-validate)
    useEffect(() => {
        setWorkOrders(initialWorkOrders);
    }, [initialWorkOrders]);

    const addWorkOrder = async (workOrder: WorkOrder) => {
        // Optimistic update
        setWorkOrders((prev) => [workOrder, ...prev]);

        try {
            // In a real app we'd map the types exactly, assuming 'workOrder' matches what createAction expects
            await createAction(workOrder);
        } catch (err) {
            console.error("Failed to create work order", err);
            // Revert on failure
            setWorkOrders((prev) => prev.filter(w => w.id !== workOrder.id));
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
