"use client";

import React, { createContext, useContext } from "react";
import { Asset } from "@/lib/types";
import { toast } from "sonner";
import useSWR from "swr";

interface AssetsContextType {
    assets: Asset[];
    addAsset: (asset: any) => Promise<boolean>;
    updateAsset: (id: string, updates: Partial<Asset>) => Promise<boolean>;
    deleteAsset: (id: string) => Promise<boolean>;
    refreshAssets: () => Promise<void>;
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AssetsProvider({
    children,
    initialAssets = []
}: {
    children: React.ReactNode;
    initialAssets?: Asset[];
}) {
    const { data: assets = initialAssets, mutate: swrMutate } = useSWR<Asset[]>("/api/assets", fetcher, {
        fallbackData: initialAssets,
        refreshInterval: 60000, // Assets change rarely, poll every 60 seconds
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    });

    const refreshAssets = async () => {
        try {
            await swrMutate();
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
                await swrMutate();
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
                await swrMutate();
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
                toast.success("Asset eliminato");
                await swrMutate();
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
