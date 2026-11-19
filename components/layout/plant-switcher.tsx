"use client";

import { ALL_PLANTS, usePlant } from "@/lib/plant-context";
import { Building2, Check, ChevronsUpDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

export function PlantSwitcher({ isCollapsed }: { isCollapsed?: boolean }) {
    const { plants, activePlant, selected, canSelectAll, setSelection, isLoading } = usePlant();
    const [open, setOpen] = useState(false);

    if (isLoading || plants.length === 0) return null;

    const label = activePlant?.name ?? (selected === ALL_PLANTS ? "Tutti gli stabilimenti" : "Seleziona...");
    const Icon = activePlant ? Building2 : Layers;

    const trigger = (
        <div className={cn("flex items-center gap-2 truncate", isCollapsed && "justify-center")}>
            <div className="flex bg-sidebar-primary/15 text-sidebar-primary p-1.5 rounded-md">
                <Icon className="w-4 h-4" />
            </div>
            {!isCollapsed && (
                <div className="flex flex-col items-start truncate text-left">
                    <span className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Stabilimento</span>
                    <span className="truncate max-w-[130px]">{label}</span>
                </div>
            )}
        </div>
    );
    const baseClass = "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground border border-sidebar-border";

    // Un solo stabilimento assegnato: nessuna scelta, solo l'indicazione di dove si sta lavorando
    if (plants.length === 1 && !canSelectAll) {
        return <div className={cn(baseClass, isCollapsed && "justify-center px-0")} title={label}>{trigger}</div>;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className={cn(baseClass, "hover:bg-sidebar-accent/80 transition-colors", isCollapsed && "justify-center px-0")}
                    title={isCollapsed ? label : undefined}
                >
                    {trigger}
                    {!isCollapsed && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0 ml-2" align="start">
                <div className="p-2 space-y-1">
                    {canSelectAll && (
                        <Option active={selected === ALL_PLANTS} onClick={() => { setSelection(ALL_PLANTS); setOpen(false); }}>
                            <Layers className="w-4 h-4 mr-2 shrink-0 opacity-70" />
                            <span className="truncate">Tutti gli stabilimenti</span>
                        </Option>
                    )}
                    {plants.map((plant) => (
                        <Option key={plant.id} active={selected === plant.id} onClick={() => { setSelection(plant.id); setOpen(false); }}>
                            <span className="truncate">{plant.name}</span>
                        </Option>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function Option({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors",
                active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-foreground"
            )}
        >
            <span className="flex items-center min-w-0">{children}</span>
            {active && <Check className="w-4 h-4 shrink-0" />}
        </button>
    );
}
