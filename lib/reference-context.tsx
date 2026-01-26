"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Technician, MaintenanceActivity } from "@/lib/types";
import { mockTechnicians, mockActivities } from "@/lib/mock-data";

interface ReferenceContextType {
    technicians: Technician[];
    activities: MaintenanceActivity[];
    addTechnician: (name: string, specialty: string, hourlyRate: number) => void;
    removeTechnician: (id: string) => void;
    addActivity: (label: string, category?: string) => void;
    removeActivity: (id: string) => void;
}

const ReferenceContext = createContext<ReferenceContextType | undefined>(undefined);

export function ReferenceProvider({ children }: { children: React.ReactNode }) {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [activities, setActivities] = useState<MaintenanceActivity[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        const { getTechnicians, getActivities } = await import('@/lib/actions');
        const techs = await getTechnicians();
        const acts = await getActivities();

        setTechnicians(techs);
        setActivities(acts);
        setIsLoaded(true);
    };

    const addTechnician = async (name: string, specialty: string, hourlyRate: number) => {
        const { addTechnician } = await import('@/lib/actions');
        const result = await addTechnician({ name, specialty, hourlyRate });

        if (result.success && result.data) {
            setTechnicians(prev => [...prev, result.data as Technician]);
        } else {
            alert(result.message);
        }
    };

    const removeTechnician = async (id: string) => {
        const { deleteTechnician } = await import('@/lib/actions');
        const result = await deleteTechnician(id);
        if (result.success) {
            setTechnicians(prev => prev.filter(t => t.id !== id));
        } else {
            alert(result.message);
        }
    };

    const addActivity = async (label: string, category?: string) => {
        const { addActivity } = await import('@/lib/actions');
        const result = await addActivity({ label, category });
        if (result.success && result.data) {
            setActivities(prev => [...prev, result.data as MaintenanceActivity]);
        } else {
            alert(result.message);
        }
    };

    const removeActivity = async (id: string) => {
        const { deleteActivity } = await import('@/lib/actions');
        const result = await deleteActivity(id);
        if (result.success) {
            setActivities(prev => prev.filter(a => a.id !== id));
        } else {
            alert(result.message);
        }
    };

    return (
        <ReferenceContext.Provider value={{ technicians, activities, addTechnician, removeTechnician, addActivity, removeActivity }}>
            {children}
        </ReferenceContext.Provider>
    );
}

export function useReference() {
    const context = useContext(ReferenceContext);
    if (!context) {
        throw new Error("useReference must be used within a ReferenceProvider");
    }
    return context;
}
