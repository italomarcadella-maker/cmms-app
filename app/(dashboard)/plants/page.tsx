"use client";

import React, { useState, useEffect } from "react";
import { getPlants, addPlant, deletePlant } from "@/lib/actions";
import { Factory, Plus, Trash2, MapPin, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function PlantsPage() {
    const [plants, setPlants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    
    const [newName, setNewName] = useState("");
    const [newLocation, setNewLocation] = useState("");

    const loadData = async () => {
        const data = await getPlants();
        setPlants(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setAdding(true);
        const res = await addPlant({ name: newName, location: newLocation });
        setAdding(false);
        if (res.success) {
            toast.success("Stabilimento aggiunto con successo");
            setNewName("");
            setNewLocation("");
            loadData();
        } else {
            toast.error(res.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Sei sicuro di voler eliminare questo stabilimento?")) return;
        const res = await deletePlant(id);
        if (res.success) {
            toast.success("Stabilimento eliminato");
            loadData();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                        <Factory className="h-8 w-8 text-indigo-600" />
                        Gestione Stabilimenti
                    </h1>
                    <p className="text-slate-500 mt-1">Definisci i siti produttivi del tuo impianto.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form to add */}
                <Card className="md:col-span-1 border-indigo-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Nuovo Stabilimento</CardTitle>
                        <CardDescription>Aggiungi un nuovo sito alla lista.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome</label>
                                <Input 
                                    placeholder="es. Plant 01" 
                                    value={newName} 
                                    onChange={e => setNewName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ubicazione</label>
                                <Input 
                                    placeholder="es. Milano, IT" 
                                    value={newLocation} 
                                    onChange={e => setNewLocation(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={adding}>
                                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                Aggiungi
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List of plants */}
                <div className="md:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : plants.length === 0 ? (
                        <Card className="border-dashed py-12 text-center text-slate-400">
                            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>Nessuno stabilimento definito.</p>
                        </Card>
                    ) : (
                        plants.map(p => (
                            <Card key={p.id} className="hover:border-indigo-200 transition-colors shadow-sm group">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                            <Factory className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{p.name}</h3>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <MapPin className="h-3 w-3" />
                                                {p.location || "Nessuna location"}
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(p.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
