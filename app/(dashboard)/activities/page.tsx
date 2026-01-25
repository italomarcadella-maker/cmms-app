"use client";

import { useState } from "react";
import { useReference } from "@/lib/reference-context";
import { Plus, Trash2, ListChecks } from "lucide-react";

export default function ActivitiesPage() {
    const { activities, addActivity, removeActivity } = useReference();
    const [newActivity, setNewActivity] = useState("");
    const [category, setCategory] = useState("General");

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newActivity.trim()) {
            addActivity(newActivity.trim(), category);
            setNewActivity("");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Attività di Manutenzione
                </h1>
                <p className="text-muted-foreground mt-1">Gestisci le attività standard per le checklist degli ordini di lavoro.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add New Activity */}
                <div className="md:col-span-1">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" /> Nuova Attività
                        </h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">Descrizione Attività</label>
                                <input
                                    id="name"
                                    required
                                    placeholder="es. Controllo livello olio"
                                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    value={newActivity}
                                    onChange={(e) => setNewActivity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="category" className="text-sm font-medium">Categoria</label>
                                <select
                                    id="category"
                                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="General">Generale</option>
                                    <option value="Mechanical">Meccanica</option>
                                    <option value="Electrical">Elettrica</option>
                                    <option value="Inspection">Ispezione</option>
                                    <option value="Cleaning">Pulizia</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-primary text-primary-foreground h-10 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                Aggiungi Attività
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Activities */}
                <div className="md:col-span-2">
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <ListChecks className="h-4 w-4 text-muted-foreground" /> Elenco Attività ({activities.length})
                            </h3>
                        </div>
                        <div className="divide-y max-h-[600px] overflow-y-auto">
                            {activities.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground italic">
                                    Nessuna attività definita.
                                </div>
                            ) : (
                                activities.map((activity) => (
                                    <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                                        <div>
                                            <p className="font-medium">{activity.label}</p>
                                            <p className="text-xs text-muted-foreground">{activity.category || "General"}</p>
                                        </div>
                                        <button
                                            onClick={() => removeActivity(activity.id)}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                            title="Rimuovi attività"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
