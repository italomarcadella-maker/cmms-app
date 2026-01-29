"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { PreventiveSchedule, WorkOrder } from "@/lib/types";
import { useWorkOrders } from "./work-orders-context";

interface PMContextType {
    schedules: PreventiveSchedule[];
    addSchedule: (schedule: PreventiveSchedule) => void;
    updateSchedule: (id: string, updates: Partial<PreventiveSchedule>) => void;
    deleteSchedule: (id: string) => void;
    generateDueWorkOrders: () => number; // Returns count of generated WOs
}

const PMContext = createContext<PMContextType | undefined>(undefined);

export function PMProvider({ children }: { children: React.ReactNode }) {
    const [schedules, setSchedules] = useState<PreventiveSchedule[]>([]);
    const { addWorkOrder } = useWorkOrders();
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from Server
    useEffect(() => {
        // We can't use async directly in useEffect
        const loadSchedules = async () => {
            // We need to import the server action. 
            // Since this is a client component, we might need to pass the initial data as props or fetch it.
            // But for now, let's assume we can call the action if it's marked 'use server'.
            // However, context providers are usually client components.
            // Let's rely on a fetch wrapper or effective refetching.
            // For simplicity in this codebase structure, I'll stub the fetch here or use a separate effect to fetch if exposed via API, 
            // OR better: define the action usage pattern.

            // Actually, importing server actions into client components is allowed in Next.js 14+.
            // I'll dynamically import to avoid build issues if mixed, or just assume I can import it.
            // Let's import it at the top of the file.
        };
        // Trigger generic data load/refresh if possible
        refreshSchedules();
    }, []);

    const refreshSchedules = async () => {
        // Dynamically import to ensure client-side safety if needed, or just standard import
        const { getPreventiveSchedules } = await import('@/lib/actions');
        const data = await getPreventiveSchedules();
        // Transform data to match type if needed (dates are strings in types usually)
        setSchedules(data as any[]);
        setIsLoaded(true);
    };

    const addSchedule = (schedule: PreventiveSchedule) => {
        // This would also need a server action in a real full impl, 
        // but for now the user only asked for DELETE.
        // I will keep the local optimsitic update or just log warning that Add is not fully DB backed yet 
        // unless I implement addPreventiveSchedule too.
        // For consistency, I should probably just append to local state for now OR 
        // realize that without an ADD action, new schedules won't persist.
        // But the user didn't ask for "Add".
        setSchedules(prev => [...prev, schedule]);
    };

    const updateSchedule = (id: string, updates: Partial<PreventiveSchedule>) => {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const deleteSchedule = async (id: string) => {
        const { deletePreventiveSchedule } = await import('@/lib/actions');
        const result = await deletePreventiveSchedule(id);

        if (result.success) {
            setSchedules(prev => prev.filter(s => s.id !== id));
        } else {
            alert(result.message);
        }
    };

    const generateDueWorkOrders = () => {
        const today = new Date();
        let generatedCount = 0;

        const updatedSchedules = schedules.map(schedule => {
            const dueDate = new Date(schedule.nextDueDate);
            if (dueDate <= today) {
                // Generate Work Order
                const newWO: WorkOrder = {
                    id: `WO-PM-${Date.now()}-${generatedCount}`,
                    title: `[PM] ${schedule.taskTitle}`,
                    description: schedule.description,
                    assetId: schedule.assetId,
                    assetName: schedule.assetName || "Unknown Asset", // Handle missing assetName
                    priority: 'MEDIUM',
                    status: 'OPEN',
                    assignedTo: 'Unassigned',
                    dueDate: schedule.nextDueDate,
                    createdAt: new Date().toISOString(),
                    partsUsed: [],
                    laborLogs: [],
                    checklist: [],
                    category: 'OTHER' // Default
                };

                addWorkOrder(newWO);
                generatedCount++;

                // Update Next Due Date
                const nextDue = new Date(dueDate);
                nextDue.setDate(nextDue.getDate() + schedule.frequencyDays);

                return {
                    ...schedule,
                    lastRunDate: new Date().toISOString().split('T')[0],
                    nextDueDate: nextDue.toISOString().split('T')[0]
                };
            }
            return schedule;
        });

        if (generatedCount > 0) {
            setSchedules(updatedSchedules);
            // Ideally sync these nextDueDate updates back to DB too.
        }
        return generatedCount;
    };

    return (
        <PMContext.Provider value={{ schedules, addSchedule, updateSchedule, deleteSchedule, generateDueWorkOrders }}>
            {children}
        </PMContext.Provider>
    );
}

export function usePM() {
    const context = useContext(PMContext);
    if (!context) {
        throw new Error("usePM must be used within a PMProvider");
    }
    return context;
}
