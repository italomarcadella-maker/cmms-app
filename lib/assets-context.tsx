"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Asset } from "@/lib/types";

interface AssetsContextType {
    assets: Asset[];
    addAsset: (asset: Asset) => void;
    updateAsset: (id: string, updates: Partial<Asset>) => void;
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

    useEffect(() => {
        setAssets(initialAssets);
    }, [initialAssets]);

    const addAsset = (asset: Asset) => {
        // TODO: Implement server action for addAsset
        const newAsset = { ...asset, id: asset.id || `ASSET-${Date.now()}` };
        setAssets((prev) => [newAsset, ...prev]);
    };

    const updateAsset = (id: string, updates: Partial<Asset>) => {
        // TODO: Implement server action for updateAsset
        setAssets(prev => prev.map(asset => asset.id === id ? { ...asset, ...updates } : asset));
    };

    return (
        <AssetsContext.Provider value={{ assets, addAsset, updateAsset }}>
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
