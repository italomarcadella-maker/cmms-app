"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SparePart } from "@/lib/types";
import { toast } from "sonner"; // Added for alerts

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
        refreshParts();
    }, []);

    const refreshParts = async () => {
        const { getSpareParts } = await import('@/lib/actions');
        const data = await getSpareParts();
        setParts(data);
        setIsLoaded(true);
    }

    const addPart = async (partData: Omit<SparePart, "id" | "lastUpdated">) => {
        const { addSparePart } = await import('@/lib/actions');
        const result = await addSparePart(partData);
        if (result.success && result.data) {
            setParts(prev => [...prev, result.data as SparePart]);
            toast.success("Ricambio aggiunto con successo");
        } else {
            toast.error(result.message);
        }
    };

    const updateQuantity = async (id: string, newQuantity: number) => {
        const { updateSparePartQuantity } = await import('@/lib/actions');
        const result = await updateSparePartQuantity(id, newQuantity);

        if (result.success && result.data) {
            const updatedPart = result.data as SparePart;
            setParts(prev => prev.map(p =>
                p.id === id ? updatedPart : p
            ));

            // Smart Low Stock Alert
            if (updatedPart.quantity <= updatedPart.minQuantity) {
                toast.warning(`Attenzione: Scorta in esaurimento per ${updatedPart.name}! (${updatedPart.quantity} rimanenti)`, {
                    duration: 5000,
                    action: {
                        label: "Ordina",
                        onClick: () => console.log("Order triggered") // Placeholder for ordering flow
                    }
                });
            } else {
                toast.success("Quantità aggiornata");
            }

        } else {
            toast.error(result.message);
        }
    };

    const removePart = async (id: string) => {
        const { deleteSparePart } = await import('@/lib/actions');
        const result = await deleteSparePart(id);

        if (result.success) {
            setParts(prev => prev.filter(p => p.id !== id));
            toast.success("Ricambio rimosso");
        } else {
            toast.error(result.message);
        }
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
