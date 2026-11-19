"use client";

import { Building2 } from "lucide-react";
import { usePlant } from "@/lib/plant-context";
import { cn } from "@/lib/utils";

/**
 * Etichetta dello stabilimento di un record. Compare solo quando i dati mostrati coprono piu' stabilimenti
 * (selezione "Tutti"), cosi' non appesantisce la vista di un singolo plant. `force` la mostra sempre
 * (usato nelle viste trasversali, dove l'origine del dato conta).
 */
export function PlantBadge({ plantId, name, force, className }: { plantId?: string | null; name?: string | null; force?: boolean; className?: string }) {
    const { isMultiPlant, plantName } = usePlant();
    if (!force && !isMultiPlant) return null;
    const label = name ?? plantName(plantId);
    if (!label) return null;
    return (
        <span className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground", className)}>
            <Building2 className="h-3 w-3" />
            {label}
        </span>
    );
}
