"use client";

import { useState, useEffect } from "react";
import { useComponents, ComponentItem } from "@/lib/components-context";
import { Ruler, X, Save, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function MeasureDialog({ component, children }: { component: ComponentItem, children: React.ReactNode }) {
    const { addMeasurement } = useComponents();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [operator, setOperator] = useState(user ? user.name : "");

    // Update operator when user changes or updates
    useEffect(() => {
        if (user) setOperator(user.name);
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value) return;


        addMeasurement(component.id, {
            date: date,
            value1: parseFloat(value),
            operator: operator || (user ? user.name : "Unknown")
        });

        setValue("");
        setDate(new Date().toISOString().split('T')[0]); // Reset to today
        setOpen(false);
    };

    return (
        <>
            <div onClick={() => setOpen(true)}>{children}</div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-xl border animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-lg">Nuova Misura: {component.code}</h3>
                            <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Data Rilevazione</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="date"
                                        required
                                        className="flex h-10 w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Operatore</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Nome Operatore"
                                        value={operator}
                                        onChange={(e) => setOperator(e.target.value)}
                                    />
                                </div>
                            </div>


                            <div className="space-y-2">
                                <label className="text-sm font-medium">Diametro Rilevato (mm)</label>
                                <div className="relative">
                                    <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        type="number"
                                        step="0.01"
                                        className="flex h-10 w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="es. 49.95"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
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
                                    <Save className="h-4 w-4" /> Salva Misura
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
