"use client";

import { useState } from "react";
import { Plus, Trash2, Gauge, Zap, Droplets, Flame } from "lucide-react";
import { createMeter, deleteMeter } from "@/lib/actions";
import { useRouter } from "next/navigation";

export function MetersList({ initialMeters }: { initialMeters: any[] }) {
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Form State
    const [name, setName] = useState("");
    const [type, setType] = useState("ELEC");
    const [unit, setUnit] = useState("kWh");
    const [serial, setSerial] = useState("");
    const [location, setLocation] = useState("");

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createMeter({
                name, type, unit, serialNumber: serial, location
            });
            setIsAdding(false);
            setName(""); setSerial(""); setLocation("");
            router.refresh();
        } catch (error) {
            alert("Errore creazione.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Eliminare questo contatore?")) return;
        try {
            await deleteMeter(id);
            router.refresh();
        } catch (error) {
            alert("Errore eliminazione.");
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ELEC': return <Zap className="h-4 w-4 text-yellow-600" />;
            case 'WATER': return <Droplets className="h-4 w-4 text-blue-600" />;
            case 'GAS': return <Flame className="h-4 w-4 text-orange-600" />;
            default: return <Gauge className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex justify-end">
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:translate-y-0.5 transition-all"
                >
                    <Plus className={`h-4 w-4 transition-transform ${isAdding ? "rotate-45" : ""}`} />
                    {isAdding ? "Annulla" : "Nuovo Contatore"}
                </button>
            </div>

            {/* Form */}
            {isAdding && (
                <div className="bg-card border rounded-xl p-6 shadow-sm animate-in slide-in-from-top-4">
                    <h3 className="font-semibold mb-4">Dettagli Contatore</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nome Identificativo</label>
                            <input required value={name} onChange={e => setName(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background" placeholder="es. Contatore Generale" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo</label>
                            <select value={type} onChange={e => { setType(e.target.value); setUnit(e.target.value === 'ELEC' ? 'kWh' : 'm3'); }} className="w-full h-10 px-3 rounded-md border bg-background">
                                <option value="ELEC">Elettricità</option>
                                <option value="WATER">Acqua</option>
                                <option value="GAS">Gas</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Unità di Misura</label>
                            <input required value={unit} onChange={e => setUnit(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Numero di Serie</label>
                            <input value={serial} onChange={e => setSerial(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Ubicazione</label>
                            <input value={location} onChange={e => setLocation(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background" placeholder="es. Cabina Elettrica A" />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90">
                                {loading ? "Salvataggio..." : "Salva Contatore"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialMeters.map(meter => (
                    <div key={meter.id} className="bg-card border rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-md bg-muted">
                                    {getIcon(meter.type)}
                                </div>
                                <span className="font-semibold">{meter.name}</span>
                            </div>
                            <button onClick={() => handleDelete(meter.id)} className="text-muted-foreground hover:text-red-600 transition-colors p-1">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                                <span>Tipo:</span> <span className="font-mono">{meter.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Matricola:</span> <span className="font-mono">{meter.serialNumber || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Ubicazione:</span> <span>{meter.location || '-'}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {initialMeters.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-xl">
                        Nessun contatore presente. Aggiungine uno per iniziare.
                    </div>
                )}
            </div>
        </div>
    );
}
