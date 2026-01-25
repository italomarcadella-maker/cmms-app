"use client";

import { useInventory } from "@/lib/inventory-context";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function LowStockWidget() {
    const { parts } = useInventory();

    const lowStockItems = parts.filter(part => part.quantity <= part.minQuantity);

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Rifornimenti Necessari
                    </h3>
                    <span className="text-sm text-muted-foreground">
                        {lowStockItems.length} articoli sottoscorta
                    </span>
                </div>
            </div>
            <div className="p-6 pt-0">
                {lowStockItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                        <p>Nessun articolo sottoscorta.</p>
                        <p className="text-sm">Il magazzino è in ordine!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="divide-y rounded-md border">
                            {lowStockItems.slice(0, 5).map(part => (
                                <div key={part.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{part.name}</p>
                                        <p className="text-xs text-muted-foreground">{part.warehouse} - {part.location}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-destructive">
                                            {part.quantity} / {part.minQuantity}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Pz.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {lowStockItems.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground">
                                + altri {lowStockItems.length - 5} articoli...
                            </p>
                        )}
                        <Link
                            href="/inventory"
                            className="w-full inline-flex items-center justify-center text-sm font-medium text-primary hover:underline h-9"
                        >
                            Gestisci Magazzino <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
