"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SparePart } from "@/lib/types";

interface InventoryContextType {
    parts: SparePart[];
    addPart: (part: Omit<SparePart, "id" | "lastUpdated">) => void;
    updateQuantity: (id: string, newQuantity: number) => void;
    removePart: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const [parts, setParts] = useState<SparePart[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const savedParts = localStorage.getItem('inventory');
        if (savedParts) {
            try {
                setParts(JSON.parse(savedParts));
            } catch (e) {
                console.error("Failed to parse inventory", e);
            }
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('inventory', JSON.stringify(parts));
        }
    }, [parts, isLoaded]);

    const addPart = (partData: Omit<SparePart, "id" | "lastUpdated">) => {
        const newPart: SparePart = {
            ...partData,
            id: `PART-${Math.floor(Math.random() * 10000)}`,
            lastUpdated: new Date().toISOString()
        };
        setParts(prev => [...prev, newPart]);
    };

    const updateQuantity = (id: string, newQuantity: number) => {
        setParts(prev => prev.map(p =>
            p.id === id ? { ...p, quantity: newQuantity, lastUpdated: new Date().toISOString() } : p
        ));
    };

    const removePart = (id: string) => {
        setParts(prev => prev.filter(p => p.id !== id));
    };

    return (
        <InventoryContext.Provider value={{ parts, addPart, updateQuantity, removePart }}>
            {children}
        </InventoryContext.Provider>
    );
}

export function useInventory() {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error("useInventory must be used within an InventoryProvider");
    }
    return context;
}
