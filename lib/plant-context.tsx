"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./auth-context";

interface Plant {
    id: string;
    name: string;
}

interface PlantContextType {
    plants: Plant[];
    activePlant: Plant | null;
    setActivePlant: (plant: Plant) => void;
    isLoading: boolean;
}

const PlantContext = createContext<PlantContextType>({
    plants: [],
    activePlant: null,
    setActivePlant: () => { },
    isLoading: true
});

export function PlantProvider({ children }: { children: ReactNode }) {
    const { user, status } = useAuth();
    const [plants, setPlants] = useState<Plant[]>([]);
    const [activePlant, setActivePlantState] = useState<Plant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === 'authenticated' && user) {
            // Fetch plants from API
            fetch('/api/plants')
                .then(res => res.json())
                .then(data => {
                    const fetchedPlants = data.plants || [];
                    setPlants(fetchedPlants);

                    // Auto-select plant based on User's plantId, or localStorage, or default to first
                    const savedPlantId = localStorage.getItem('cmms_active_plant_id');
                    let defaultPlant = null;

                    if (user.plantId) {
                        defaultPlant = fetchedPlants.find((p: Plant) => p.id === user.plantId);
                    } else if (savedPlantId) {
                        defaultPlant = fetchedPlants.find((p: Plant) => p.id === savedPlantId);
                    }

                    if (!defaultPlant && fetchedPlants.length > 0) {
                        defaultPlant = fetchedPlants[0];
                    }

                    if (defaultPlant) {
                        setActivePlantState(defaultPlant);
                        document.cookie = `cmms_plant_id=${defaultPlant.id}; path=/; max-age=31536000`;
                    } else {
                        setActivePlantState(null);
                    }
                    setIsLoading(false);
                })
                .catch(e => {
                    console.error("Failed to load plants:", e);
                    setIsLoading(false);
                });
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    }, [user, status]);

    const setActivePlant = (plant: Plant) => {
        setActivePlantState(plant);
        localStorage.setItem('cmms_active_plant_id', plant.id);
        document.cookie = `cmms_plant_id=${plant.id}; path=/; max-age=31536000`; // 1 year
        // Dispatch custom event so other components (like data tables) can refresh
        window.dispatchEvent(new Event('cmms_plant_changed'));

        // Force router refresh if we are on dashboard so server components reload
        // Or let individual client components listen
    };

    return (
        <PlantContext.Provider value={{ plants, activePlant, setActivePlant, isLoading }}>
            {children}
        </PlantContext.Provider>
    );
}

export function usePlant() {
    return useContext(PlantContext);
}
