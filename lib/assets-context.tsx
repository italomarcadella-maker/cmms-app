"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Asset } from "@/lib/types";
import { toast } from "sonner";

interface AssetsContextType {
    assets: Asset[];
    addAsset: (asset: any) => Promise<boolean>;
    updateAsset: (id: string, updates: Partial<Asset>) => Promise<boolean>;
    deleteAsset: (id: string) => Promise<boolean>;
    refreshAssets: () => Promise<void>;
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export function AssetsProvider({
    children,
    initialAssets = []
}: {
    children: React.ReactNode;
    initialAssets?: Asset[];
}) {
    const [assets, setAssets] = useState<Asset[]>(initialAssets);

    // Initial fetch to ensure client-side hydration happens with fresh data if initial is stale
    useEffect(() => {
        refreshAssets();
    }, []);

    const refreshAssets = async () => {
        try {
            const { getAssets } = await import('@/lib/actions');
            const data = await getAssets();
            setAssets(data as Asset[]);
        } catch (error) {
            console.error("Failed to fetch assets", error);
        }
    };

    const addAsset = async (assetData: any) => {
        try {
            const { addAsset: addAssetAction } = await import('@/lib/actions');
            const result = await addAssetAction(assetData);

            if (result.success && result.data) {
                toast.success("Asset creato con successo");
                await refreshAssets(); // Re-fetch to guarantee sync
                return true;
            } else {
                toast.error(result.message || "Errore durante creazione asset");
                return false;
            }
        } catch (error) {
            toast.error("Errore imprevisto");
            return false;
        }
    };

    const updateAsset = async (id: string, updates: Partial<Asset>) => {
        try {
            const { updateAsset: updateAssetAction } = await import('@/lib/actions');
            const result = await updateAssetAction(id, updates);

            if (result.success) {
                toast.success("Asset aggiornato");
                await refreshAssets();
                return true;
            } else {
                toast.error(result.message || "Errore aggiornamento");
                return false;
            }
        } catch (error) {
            toast.error("Errore imprevisto");
            return false;
        }
    };

    const deleteAsset = async (id: string) => {
        try {
            const { deleteAsset: deleteAssetAction } = await import('@/lib/actions');
            const result = await deleteAssetAction(id);

            if (result.success) {
                setAssets(prev => prev.filter(a => a.id !== id));
                toast.success("Asset eliminato");
                return true;
            } else {
                toast.error(result.message || "Impossibile eliminare l'asset");
                return false;
            }
        } catch (error) {
            toast.error("Errore imprevisto");
            return false;
        }
    };

    return (
        <AssetsContext.Provider value={{ assets, addAsset, updateAsset, deleteAsset, refreshAssets }}>
            {children}
        </AssetsContext.Provider>
    );
}

export function useAssets() {
    const context = useContext(AssetsContext);
    if (context === undefined) {
        throw new Error("useAssets must be used within an AssetsProvider");
    }
    return context;
}
