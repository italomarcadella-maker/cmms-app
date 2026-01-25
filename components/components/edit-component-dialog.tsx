"use client";

import { useState } from "react";
import { useComponents, ComponentItem, UsageType, WarehouseType } from "@/lib/components-context";
import { useAssets } from "@/lib/assets-context";
import { Pencil, Save, X, Factory, Package } from "lucide-react";

export function EditComponentDialog({ component, children }: { component: ComponentItem, children: React.ReactNode }) {
    const { updateComponent, assignComponent, moveWarehouse } = useComponents();
    const { assets } = useAssets();
    const [open, setOpen] = useState(false);

    // State
    const [usageType, setUsageType] = useState<UsageType>(component.usageType || 'JOLLY');
    const [assignmentType, setAssignmentType] = useState<'ASSET' | 'WAREHOUSE'>(component.assignedAssetId ? 'ASSET' : 'WAREHOUSE');

    // Selections
    const [selectedAssetId, setSelectedAssetId] = useState<string>(component.assignedAssetId || (assets[0]?.id || ""));
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType>(component.warehouse || 'RETINATO');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Update basic info (Tipologia)
        updateComponent(component.id, { usageType });

        // 2. Handle Assignment
        if (assignmentType === 'ASSET') {
            // Assign to asset (clears warehouse implicitly in logic if we wanted, but context keeps them separate usually. 
            // We will trust assignComponent to handle the link)
            assignComponent(component.id, selectedAssetId);
        } else {
            // Move to warehouse (clears asset assignment)
            assignComponent(component.id, undefined); // Unassign from asset
            // We also need to update the warehouse field
            moveWarehouse(component.id, selectedWarehouse, component.location);
        }

        setOpen(false);
    };

    return (
        <>
            <div onClick={() => setOpen(true)}>{children}</div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-xl border animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-lg">Modifica Componente</h3>
                            <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-6">

                            {/* Tipologia */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipologia Utilizzo</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['SOTTOSTRATO', 'COPERTURA', 'JOLLY'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setUsageType(type as UsageType)}
                                            className={`px-2 py-2 text-xs font-medium rounded-md border transition-all ${usageType === type
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background hover:bg-muted'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-border" />

                            {/* Assegnazione */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Posizione / Assegnazione</label>

                                <div className="flex bg-muted/50 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentType('WAREHOUSE')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${assignmentType === 'WAREHOUSE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <Package className="h-4 w-4" /> Magazzino
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentType('ASSET')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${assignmentType === 'ASSET' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <Factory className="h-4 w-4" /> Asset (Macchina)
                                    </button>
                                </div>

                                {assignmentType === 'WAREHOUSE' ? (
                                    <div className="space-y-2 animate-in slide-in-from-top-1">
                                        <label className="text-xs text-muted-foreground">Seleziona Magazzino</label>
                                        <select
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            value={selectedWarehouse}
                                            onChange={(e) => setSelectedWarehouse(e.target.value as WarehouseType)}
                                        >
                                            <option value="RETINATO">Magazzino RETINATO</option>
                                            <option value="MAGLIATO">Magazzino MAGLIATO</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-in slide-in-from-top-1">
                                        <label className="text-xs text-muted-foreground">Seleziona Asset</label>
                                        <select
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            value={selectedAssetId}
                                            onChange={(e) => setSelectedAssetId(e.target.value)}
                                        >
                                            {assets.map(a => (
                                                <option key={a.id} value={a.id}>{a.name} ({a.model})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
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
