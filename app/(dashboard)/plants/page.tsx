"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Factory, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { getPlants, addPlant, deletePlant } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PlantEditDialog, type PlantRecord } from "@/components/plants/plant-edit-dialog";

export default function PlantsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const { confirm, dialog } = useConfirm();
    const [plants, setPlants] = useState<PlantRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newLocation, setNewLocation] = useState("");

    const load = useCallback(async () => {
        setPlants((await getPlants()) as PlantRecord[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        let alive = true;
        getPlants().then(r => { if (alive) { setPlants(r as PlantRecord[]); setLoading(false); } });
        return () => { alive = false; };
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setAdding(true);
        const res = await addPlant({ name: newName, location: newLocation });
        setAdding(false);
        if (res.success) {
            toast.success("Stabilimento aggiunto");
            setNewName("");
            setNewLocation("");
            load();
        } else toast.error(res.message);
    };

    const handleDelete = async (plant: PlantRecord) => {
        const ok = await confirm({
            title: `Eliminare ${plant.name}?`,
            description: "L'operazione è possibile solo se allo stabilimento non sono collegati asset, ordini o ricambi.",
            confirmLabel: "Elimina",
            variant: "destructive",
        });
        if (!ok) return;
        const res = await deletePlant(plant.id);
        if (res.success) { toast.success("Stabilimento eliminato"); load(); } else toast.error(res.message);
    };

    return (
        <div className="mx-auto max-w-5xl">
            <PageHeader
                title="Stabilimenti"
                description={isAdmin
                    ? "I siti produttivi del gruppo. Ogni stabilimento ha i propri dati, le proprie tariffe e i propri responsabili."
                    : "I tuoi stabilimenti: puoi aggiornare tariffe e costi usati nei calcoli di KPI, energia e fermi."}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {isAdmin && (
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-base">Nuovo stabilimento</CardTitle>
                            <CardDescription>Aggiungi un sito. Poi assegnagli gli utenti dalla pagina Utenti.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="newName">Nome</label>
                                    <Input id="newName" placeholder="es. SND" value={newName} onChange={e => setNewName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="newLoc">Ubicazione</label>
                                    <Input id="newLoc" placeholder="es. Sandrigo (VI)" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                                </div>
                                <Button type="submit" className="w-full" disabled={adding}>
                                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Aggiungi
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <div className={isAdmin ? "space-y-3 md:col-span-2" : "space-y-3 md:col-span-3"}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : plants.length === 0 ? (
                        <Card><EmptyState icon={<Factory />} title="Nessuno stabilimento" description="Aggiungi il primo stabilimento per iniziare." /></Card>
                    ) : (
                        plants.map(p => (
                            <Card key={p.id}>
                                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-lg bg-primary/10 p-3 text-primary"><Factory className="h-5 w-5" /></div>
                                        <div>
                                            <h3 className="font-semibold">{p.name}</h3>
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3" />{p.location || "Nessuna ubicazione"} · {p.timezone}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <PlantEditDialog plant={p} canEditRegistry={isAdmin} onSaved={load} />
                                        {isAdmin && (
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-critical" onClick={() => handleDelete(p)} aria-label={`Elimina ${p.name}`}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
            {dialog}
        </div>
    );
}
