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
        const savedTechs = localStorage.getItem('technicians');
        const savedActs = localStorage.getItem('activities');

        if (savedTechs) {
            try {
                const parsed = JSON.parse(savedTechs);
                // Ensure hourlyRate exists for legacy data
                const patched = parsed.map((t: any) => ({
                    ...t,
                    hourlyRate: t.hourlyRate || 40
                }));
                setTechnicians(patched);
            } catch (e) { setTechnicians(mockTechnicians); }
        } else {
            setTechnicians(mockTechnicians);
        }

        if (savedActs) {
            try { setActivities(JSON.parse(savedActs)); } catch (e) { setActivities(mockActivities); }
        } else {
            setActivities(mockActivities);
        }

        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('technicians', JSON.stringify(technicians));
            localStorage.setItem('activities', JSON.stringify(activities));
        }
    }, [technicians, activities, isLoaded]);

    const addTechnician = (name: string, specialty: string, hourlyRate: number) => {
        const newTech: Technician = {
            id: `T-${Math.floor(Math.random() * 10000)}`,
            name,
            specialty,
            hourlyRate
        };
        setTechnicians(prev => [...prev, newTech]);
    };

    const removeTechnician = (id: string) => {
        setTechnicians(prev => prev.filter(t => t.id !== id));
    };

    const addActivity = (label: string, category?: string) => {
        const newAct: MaintenanceActivity = {
            id: `ACT-${Math.floor(Math.random() * 10000)}`,
            label,
            category
        };
        setActivities(prev => [...prev, newAct]);
    };

    const removeActivity = (id: string) => {
        setActivities(prev => prev.filter(a => a.id !== id));
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
