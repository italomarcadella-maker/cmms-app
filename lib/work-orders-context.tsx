"use client";

import React, { createContext, useContext, useMemo } from "react";
import { WorkOrder } from "@/lib/types";
import { updateWorkOrderStatus as updateStatusAction } from "@/lib/actions";
import useSWR from "swr";

interface WorkOrdersContextType {
    workOrders: WorkOrder[];
    addWorkOrder: (workOrder: WorkOrder) => Promise<void>;
    updateWorkOrderStatus: (id: string, status: WorkOrder["status"]) => Promise<void>;
    updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => Promise<void>;
    deleteWorkOrder: (id: string) => Promise<void>;
    refreshWorkOrders: () => Promise<void>;
}

const WorkOrdersContext = createContext<WorkOrdersContextType | undefined>(undefined);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function WorkOrdersProvider({
    children,
    initialWorkOrders = []
}: {
    children: React.ReactNode;
    initialWorkOrders?: WorkOrder[];
}) {
    const { data, mutate: swrMutate } = useSWR<WorkOrder[]>("/api/work-orders", fetcher, {
        fallbackData: initialWorkOrders,
        refreshInterval: 30000, // 30 seconds smart polling
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    });

    const workOrders = useMemo(() => {
        if (!data) return [];
        return data.map(wo => ({
            ...wo,
            assetName: (wo as any).asset?.name || 'Unknown',
        })) as WorkOrder[];
    }, [data]);

    const refreshWorkOrders = async () => {
        await swrMutate();
    };

    const addWorkOrder = async (workOrder: WorkOrder) => {
        // Optimistic update
        const updatedList = [workOrder, ...workOrders];
        swrMutate(updatedList, false);

        try {
            const { createWorkOrder } = await import('@/lib/actions');
            const res = await createWorkOrder(workOrder);

            if (!res.success) {
                throw new Error(res.message);
            }
            await swrMutate();
        } catch (err) {
            console.error("Failed to create work order", err);
            await swrMutate(); // Rollback
            alert("Errore salvataggio ordine: " + err);
        }
    };

    const deleteWorkOrder = async (id: string) => {
        // Optimistic update
        const updatedList = workOrders.filter(wo => wo.id !== id);
        swrMutate(updatedList, false);

        try {
            const { deleteWorkOrder } = await import('@/lib/actions');
            const res = await deleteWorkOrder(id);
            if (!res.success) {
                alert(res.message);
            }
            await swrMutate();
        } catch (err) {
            alert("Errore eliminazione");
            await swrMutate();
        }
    };

    const updateWorkOrderStatus = async (id: string, status: WorkOrder["status"]) => {
        // Optimistic update
        const updatedList = workOrders.map(wo => wo.id === id ? { ...wo, status } : wo);
        swrMutate(updatedList, false);

        try {
            await updateStatusAction(id, status);
            await swrMutate();
        } catch (err) {
            console.error("Failed to update status", err);
            await swrMutate();
        }
    };

    const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
        // Optimistic update
        const updatedList = workOrders.map(wo => wo.id === id ? { ...wo, ...updates } : wo);
        swrMutate(updatedList, false);

        try {
            const { updateWorkOrderDetails } = await import('@/lib/actions');
            await updateWorkOrderDetails(id, updates);
            await swrMutate();
        } catch (err) {
            console.error("Failed to persist WO update", err);
            await swrMutate();
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
