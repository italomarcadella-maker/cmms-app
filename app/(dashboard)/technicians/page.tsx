"use client";

import { useState } from "react";
import { useReference } from "@/lib/reference-context";
import { Plus, Users, User, Trash2, Euro } from "lucide-react";

export default function TechniciansPage() {
    const { technicians, addTechnician, removeTechnician } = useReference();
    const [newName, setNewName] = useState("");
    const [specialty, setSpecialty] = useState("Elettricista");
    const [hourlyRate, setHourlyRate] = useState("40");

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim() && hourlyRate) {
            addTechnician(newName.trim(), specialty, parseFloat(hourlyRate));
            setNewName("");
            setHourlyRate("40");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tecnici</h1>
                    <p className="text-muted-foreground text-sm">Gestisci il personale di manutenzione.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* List */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-muted/40 font-medium text-sm">
                        Elenco Staff ({technicians.length})
                    </div>
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                        {technicians.map(tech => (
                            <div key={tech.id} className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors group">
                                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{tech.name}</div>
                                    <div className="text-xs text-muted-foreground">{tech.specialty} • €{tech.hourlyRate}/h</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-muted-foreground">{tech.id}</span>
                                    <button
                                        onClick={() => removeTechnician(tech.id)}
                                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-2"
                                        title="Rimuovi Tecnico"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Form */}
                <div className="h-fit rounded-xl border bg-card shadow-sm p-6">
                    <h3 className="font-semibold mb-4">Registra Tecnico</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">Nome Completo</label>
                            <input
                                id="name"
                                required
                                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder="es. Alessandro Volta"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="specialty" className="text-sm font-medium">Funzione / Ruolo</label>
                            <select
                                id="specialty"
                                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                            >
                                <option value="Elettricista">Elettricista</option>
                                <option value="Meccanico">Meccanico</option>
                                <option value="Impianti">Impianti</option>
                                <option value="Esterno">Esterno</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="hourlyRate" className="text-sm font-medium">Tariffa Oraria (€/h)</label>
                            <div className="relative">
                                <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <input
                                    id="hourlyRate"
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    required
                                    className="flex h-10 w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" /> Aggiungi Tecnico
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
