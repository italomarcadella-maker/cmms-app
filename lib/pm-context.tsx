"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { PreventiveSchedule, WorkOrder } from "@/lib/types";
import { useWorkOrders } from "./work-orders-context";

interface PMContextType {
    schedules: PreventiveSchedule[];
    addSchedule: (schedule: PreventiveSchedule) => void;
    deleteSchedule: (id: string) => void;
    generateDueWorkOrders: () => number; // Returns count of generated WOs
}

const PMContext = createContext<PMContextType | undefined>(undefined);

export function PMProvider({ children }: { children: React.ReactNode }) {
    const [schedules, setSchedules] = useState<PreventiveSchedule[]>([]);
    const { addWorkOrder } = useWorkOrders();
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Mock Data
    const mockSchedules: PreventiveSchedule[] = [
        {
            id: 'PM-001',
            assetId: 'AST-001',
            assetName: 'Hydraulic Press X200',
            taskTitle: 'Monthly Hydraulic Inspection',
            description: 'Check oil levels, pressure valves, and look for leaks.',
            frequencyDays: 30,
            lastRunDate: '2023-12-01',
            nextDueDate: '2024-01-01' // Overdue!
        },
        {
            id: 'PM-002',
            assetId: 'AST-002',
            assetName: 'Conveyor Belt Motor',
            taskTitle: 'Quarterly Motor Service',
            description: 'Grease bearings and check belt tension.',
            frequencyDays: 90,
            lastRunDate: '2023-10-15',
            nextDueDate: '2024-01-13'
        }
    ];

    useEffect(() => {
        const saved = localStorage.getItem('pm_schedules');
        if (saved) {
            try { setSchedules(JSON.parse(saved)); } catch (e) { setSchedules(mockSchedules); }
        } else {
            setSchedules(mockSchedules);
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('pm_schedules', JSON.stringify(schedules));
        }
    }, [schedules, isLoaded]);

    const addSchedule = (schedule: PreventiveSchedule) => {
        setSchedules(prev => [...prev, schedule]);
    };

    const deleteSchedule = (id: string) => {
        setSchedules(prev => prev.filter(s => s.id !== id));
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
                    assetName: schedule.assetName,
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
        }
        return generatedCount;
    };

    return (
        <PMContext.Provider value={{ schedules, addSchedule, deleteSchedule, generateDueWorkOrders }}>
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
