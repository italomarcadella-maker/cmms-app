"use client";

import { useState } from "react";
import { useComponents, ComponentType, UsageType, WarehouseType, ComponentStatus } from "@/lib/components-context";
import { X, Plus, Save, Package } from "lucide-react";

export function AddComponentDialog({ children }: { children: React.ReactNode }) {
    const { addComponent } = useComponents();
    const [open, setOpen] = useState(false);

    // Form State
    const [code, setCode] = useState("");
    const [model, setModel] = useState("");
    const [type, setType] = useState<ComponentType>('SCREW');
    const [usageType, setUsageType] = useState<UsageType>('JOLLY');
    const [manufacturer, setManufacturer] = useState("");
    const [warehouse, setWarehouse] = useState<WarehouseType>('RETINATO');
    const [location, setLocation] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        addComponent({
            code,
            model,
            type,
            usageType,
            manufacturer,
            warehouse,
            location,
            status: 'OPTIMAL',
            measurements: [],
            purchaseDate: new Date().toISOString().split('T')[0],
            hoursUsed: 0,
            assignedAssetId: undefined
        });

        // Reset and close
        setCode("");
        setModel("");
        setType("SCREW");
        setUsageType("JOLLY");
        setManufacturer("");
        setWarehouse("RETINATO");
        setLocation("");
        setOpen(false);
    };

    return (
        <>
            <div onClick={() => setOpen(true)}>{children}</div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-lg bg-card rounded-xl shadow-xl border animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-lg">Nuovo Componente</h3>
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
                                        placeholder="es. VITE-2024-001"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Costruttore</label>
                                    <input
                                        required
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="es. Bausano"
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
                                    placeholder="es. Vite Ø50mm PVC"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tipo Componente</label>
                                    <div className="flex bg-muted/50 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setType('SCREW')}
                                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${type === 'SCREW' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            VITE
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('BARREL')}
                                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${type === 'BARREL' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            CILINDRO
                                        </button>
                                    </div>
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
                                    <label className="text-sm font-medium">Utilizzo (Tipologia)</label>
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
                                    <label className="text-sm font-medium">Posizione (Scaffale)</label>
                                    <input
                                        required
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="es. A-12"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
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
                                    <Plus className="h-4 w-4" /> Aggiungi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
