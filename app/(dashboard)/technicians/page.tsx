"use client";

import { useState, useEffect } from "react";
import { useReference } from "@/lib/reference-context";
import { Plus, Users, User, Trash2, Euro, Loader2 } from "lucide-react";
import { BackToDashboardButton } from "@/components/ui/back-button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableUsersForTechnician } from "@/lib/actions";

export default function TechniciansPage() {
    const { technicians, addTechnician, removeTechnician } = useReference();
    const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Form State
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [specialty, setSpecialty] = useState("Elettricista");
    const [hourlyRate, setHourlyRate] = useState("40");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadUsers();
    }, [technicians]); // Reload when technicians change (one might have been removed/added)

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const users = await getAvailableUsersForTechnician();
            setAvailableUsers(users);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId || !hourlyRate) return;

        const user = availableUsers.find(u => u.id === selectedUserId);
        if (!user || !user.email) return;

        setIsSubmitting(true);
        try {
            await addTechnician(user.name || user.email, specialty, parseFloat(hourlyRate), user.email);
            // Reset form
            setSelectedUserId("");
            setHourlyRate("40");
            loadUsers(); // Refresh list to remove the added user
        } catch (error) {
            console.error("Error adding technician:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            <BackToDashboardButton />
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Users className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestione Tecnici</h1>
                    <p className="text-muted-foreground">Gestisci il personale di manutenzione e assegna ruoli tecnici agli utenti.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Staff Tecnico</CardTitle>
                            <CardDescription>
                                Attualmente {technicians.length} tecnici operativi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y rounded-md border text-sm">
                                {technicians.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        Nessun tecnico registrato.
                                    </div>
                                ) : (
                                    technicians.map(tech => (
                                        <div key={tech.id} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors group">
                                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-medium border">
                                                {tech.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold truncate">{tech.name}</div>
                                                <div className="text-muted-foreground text-xs flex items-center gap-2">
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                        {tech.specialty}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="font-mono">€{tech.hourlyRate}/h</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeTechnician(tech.id)}
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Rimuovi dal ruolo Tecnico"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Add Form Section */}
                <div className="h-fit">
                    <Card className="border-l-4 border-l-primary shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg">Aggiungi Tecnico</CardTitle>
                            <CardDescription>Promuovi un utente esistente a Tecnico.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="user-select">Seleziona Utente</Label>
                                    <Select
                                        value={selectedUserId}
                                        onValueChange={setSelectedUserId}
                                        disabled={loadingUsers}
                                    >
                                        <SelectTrigger id="user-select" className="w-full">
                                            <SelectValue placeholder={loadingUsers ? "Caricamento..." : "Seleziona un utente..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUsers.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                    Nessun utente disponibile.
                                                    <br />
                                                    <span className="text-xs">
                                                        (Crea prima un Utente in Gestione Utenti)
                                                    </span>
                                                </div>
                                            ) : (
                                                availableUsers.map(u => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.name || u.email}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                        Solo gli utenti senza profilo tecnico appaiono qui.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="specialty">Specializzazione</Label>
                                    <Select
                                        value={specialty}
                                        onValueChange={setSpecialty}
                                    >
                                        <SelectTrigger id="specialty">
                                            <SelectValue placeholder="Seleziona ruolo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Elettricista">Elettricista</SelectItem>
                                            <SelectItem value="Meccanico">Meccanico</SelectItem>
                                            <SelectItem value="Idraulico">Idraulico</SelectItem>
                                            <SelectItem value="Impianti">Manutentore Impianti</SelectItem>
                                            <SelectItem value="Programmatore PLC">Programmatore PLC</SelectItem>
                                            <SelectItem value="Esterno">Consulente Esterno</SelectItem>
                                            <SelectItem value="Generico">Manutentore Generico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hourlyRate">Costo Orario (€)</Label>
                                    <div className="relative">
                                        <Euro className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="hourlyRate"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            required
                                            className="pl-9"
                                            value={hourlyRate}
                                            onChange={(e) => setHourlyRate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={!selectedUserId || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Salvataggio...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" /> Aggiungi al Team
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
