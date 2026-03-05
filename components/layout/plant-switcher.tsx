"use client";

import { usePlant } from "@/lib/plant-context";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export function PlantSwitcher({ isCollapsed }: { isCollapsed?: boolean }) {
    const { plants, activePlant, setActivePlant, isLoading } = usePlant();
    const [open, setOpen] = useState(false);

    if (isLoading || plants.length <= 1) {
        // If only 1 plant or loading, don't show the switcher to keep UI clean
        // Or show a skeleton
        return null;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent text-sm font-medium transition-colors border border-sidebar-border/30",
                        isCollapsed ? "justify-center px-0 py-3" : ""
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        <div className="flex bg-primary/10 text-primary p-1.5 rounded-md">
                            <Building2 className="w-4 h-4" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col items-start truncate text-left">
                                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Stabilimento</span>
                                <span className="truncate max-w-[130px]">{activePlant?.name || "Seleziona..."}</span>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0 ml-2" align="start">
                <div className="p-2 space-y-1">
                    {plants.map((plant) => (
                        <button
                            key={plant.id}
                            onClick={() => {
                                setActivePlant(plant);
                                setOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors",
                                activePlant?.id === plant.id
                                    ? "bg-primary text-primary-foreground font-medium"
                                    : "hover:bg-muted text-foreground"
                            )}
                        >
                            <span className="truncate">{plant.name}</span>
                            {activePlant?.id === plant.id && (
                                <Check className="w-4 h-4" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
