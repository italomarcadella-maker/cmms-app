"use client";

import { useState, useEffect } from "react";
import { useComponents, ComponentItem, ComponentType, UsageType, WarehouseType, ComponentStatus } from "@/lib/components-context";
import { X, Save, Pencil } from "lucide-react";

export function EditComponentDialog({ component, children }: { component: ComponentItem, children: React.ReactNode }) {
    const { updateComponent } = useComponents();
    const [open, setOpen] = useState(false);

    // Form State
    const [code, setCode] = useState(component.code);
    const [model, setModel] = useState(component.model);
    const [type, setType] = useState<ComponentType>(component.type);
    const [usageType, setUsageType] = useState<UsageType>(component.usageType);
    const [manufacturer, setManufacturer] = useState(component.manufacturer);
    const [warehouse, setWarehouse] = useState<WarehouseType>(component.warehouse);
    const [location, setLocation] = useState(component.location);
    const [status, setStatus] = useState<ComponentStatus>(component.status);

    // Update state when component updates or dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                setCode(component.code);
                setModel(component.model);
                setType(component.type);
                setUsageType(component.usageType);
                setManufacturer(component.manufacturer);
                setWarehouse(component.warehouse);
                setLocation(component.location);
                setStatus(component.status);
            }, 0);
        }
    }, [open, component]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        updateComponent(component.id, {
            code,
            model,
            type,
            usageType,
            manufacturer,
            warehouse,
            location,
            status
        });

        setOpen(false);
    };

    return (
        <>
            <div onClick={() => setOpen(true)}>{children}</div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="w-full max-w-lg bg-card rounded-xl shadow-xl border animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-lg">Modifica Componente</h3>
                            <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Codice Identificativo</label>
                                    <input
                                        required
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Costruttore</label>
                                    <input
                                        required
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={manufacturer}
                                        onChange={(e) => setManufacturer(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Modello / Descrizione</label>
                                <input
                                    required
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tipo</label>
                                    <select
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={type}
                                        onChange={(e) => setType(e.target.value as ComponentType)}
                                    >
                                        <option value="SCREW">VITE</option>
                                        <option value="BARREL">CILINDRO</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Magazzino</label>
                                    <select
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={warehouse}
                                        onChange={(e) => setWarehouse(e.target.value as WarehouseType)}
                                    >
                                        <option value="RETINATO">Retinato</option>
                                        <option value="MAGLIATO">Magliato</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Utilizzo</label>
                                    <select
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={usageType}
                                        onChange={(e) => setUsageType(e.target.value as UsageType)}
                                    >
                                        <option value="SOTTOSTRATO">Sottostrato</option>
                                        <option value="COPERTURA">Copertura</option>
                                        <option value="JOLLY">Jolly</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Posizione</label>
                                    <input
                                        required
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Stato</label>
                                <select
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as ComponentStatus)}
                                >
                                    <option value="OPTIMAL">Ottimale</option>
                                    <option value="WARNING">Attenzione</option>
                                    <option value="NEEDS_NITRIDING">Da Nitrurare</option>
                                    <option value="NEEDS_REGENERATION">Da Rigenerare</option>
                                    <option value="TO_ORDER">Da Ordinare</option>
                                    <option value="CRITICAL">Critico / Rottamare</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
                                >
                                    <Save className="h-4 w-4" /> Salva Modifiche
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
