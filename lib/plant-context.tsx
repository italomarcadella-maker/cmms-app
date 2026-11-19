"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { mutate as mutateSWR } from "swr";
import { useAuth } from "./auth-context";
import { getPlantSelection, selectPlant, type PlantOption } from "./plant-actions";

export const ALL_PLANTS = "ALL";

interface PlantContextType {
    /** Stabilimenti tra cui l'utente puo' scegliere. */
    plants: PlantOption[];
    /** Stabilimento scelto, null se sono selezionati "Tutti". */
    activePlant: PlantOption | null;
    /** 'ALL' oppure l'id dello stabilimento scelto. */
    selected: string;
    /** True se i dati mostrati coprono piu' di uno stabilimento. */
    isMultiPlant: boolean;
    canSelectAll: boolean;
    isAdmin: boolean;
    /** Nome dello stabilimento a partire dall'id (per le etichette sulle righe). */
    plantName: (id: string | null | undefined) => string | null;
    /** Sceglie uno stabilimento (id) o "Tutti" (ALL_PLANTS). */
    setSelection: (value: string) => Promise<void>;
    isLoading: boolean;
}

const PlantContext = createContext<PlantContextType>({
    plants: [],
    activePlant: null,
    selected: ALL_PLANTS,
    isMultiPlant: false,
    canSelectAll: false,
    isAdmin: false,
    plantName: () => null,
    setSelection: async () => { },
    isLoading: true,
});

export function PlantProvider({ children }: { children: ReactNode }) {
    const { user, status } = useAuth();
    const router = useRouter();
    const [plants, setPlants] = useState<PlantOption[]>([]);
    const [selected, setSelected] = useState<string>(ALL_PLANTS);
    const [canSelectAll, setCanSelectAll] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            Promise.resolve().then(() => setIsLoading(false));
            return;
        }
        if (status !== "authenticated" || !user) return;
        let cancelled = false;
        getPlantSelection()
            .then(sel => {
                if (cancelled) return;
                setPlants(sel.plants);
                setSelected(sel.selected);
                setCanSelectAll(sel.canSelectAll);
                setIsAdmin(sel.isAdmin);
            })
            .catch(e => console.error("Caricamento stabilimenti non riuscito:", e))
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [user, status]);

    const setSelection = useCallback(async (value: string) => {
        const res = await selectPlant(value);
        if (!res.success) return;
        setSelected(value);
        // Il server ha cambiato scope: ricarica i dati delle pagine server e di quelle con SWR
        router.refresh();
        mutateSWR(() => true, undefined, { revalidate: true });
        window.dispatchEvent(new Event("cmms_plant_changed"));
    }, [router]);

    const value = useMemo<PlantContextType>(() => {
        const activePlant = selected !== ALL_PLANTS ? plants.find(p => p.id === selected) ?? null : null;
        return {
            plants,
            activePlant,
            selected,
            isMultiPlant: !activePlant && plants.length > 1,
            canSelectAll,
            isAdmin,
            plantName: (id) => (id ? plants.find(p => p.id === id)?.name ?? null : null),
            setSelection,
            isLoading,
        };
    }, [plants, selected, canSelectAll, isAdmin, setSelection, isLoading]);

    return <PlantContext.Provider value={value}>{children}</PlantContext.Provider>;
}

export function usePlant() {
    return useContext(PlantContext);
}
