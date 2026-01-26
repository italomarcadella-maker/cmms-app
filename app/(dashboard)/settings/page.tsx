"use client";

import { Save, User, Globe, AlertTriangle, Download, Trash2, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { resetDatabase } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const [theme, setTheme] = useState("light");

    const handleExport = () => {
        const data = {
            assets: localStorage.getItem("assets"),
            workOrders: localStorage.getItem("workOrders"),
            inventory: localStorage.getItem("inventory"),
            technicians: localStorage.getItem("technicians"),
            activities: localStorage.getItem("activities"),
            schedules: localStorage.getItem("pm_schedules")
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cmms_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const router = useRouter();
    const handleReset = async () => {
        if (confirm("Sei sicuro di voler cancellare TUTTI i dati? Questa azione è irreversibile e cancellerà Ordini, Asset, Tecnici e Utenti non-admin.")) {
            // localStorage.clear(); // We keep local storage clear just in case legacy stuff is there
            try {
                const result = await resetDatabase();
                if (result.success) {
                    alert(result.message);
                    router.refresh();
                } else {
                    alert(result.message);
                }
            } catch (e) {
                console.error(e);
                alert("Errore durante il reset.");
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Impostazioni
                </h1>
                <p className="text-muted-foreground mt-1">Gestisci profilo, preferenze e dati dell'applicazione.</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Section */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Profilo Utente</h3>
                            <p className="text-sm text-muted-foreground">Informazioni personali e aziendali.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nome Azienda</label>
                            <input type="text" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="My Factory S.p.A." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nome Utente</label>
                            <input type="text" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="Mario Rossi" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input type="email" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" defaultValue="mario.rossi@factory.it" />
                        </div>
                        <div className="col-span-full pt-2">
                            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-primary/90 flex items-center gap-2">
                                <Save className="h-4 w-4" /> Salva Modifiche
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Globe className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Preferenze Applicazione</h3>
                            <p className="text-sm text-muted-foreground">Lingua, tema e notifiche.</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium block">Lingua Interfaccia</label>
                            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                                <option value="it">Italiano</option>
                                <option value="en">English (US)</option>
                                <option value="de">Deutsch</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium block">Tema</label>
                            <div className="flex items-center gap-4">
                                <button className="flex items-center gap-2 px-4 py-2 rounded-md border bg-muted/50 text-sm font-medium border-primary ring-1 ring-primary">
                                    <Sun className="h-4 w-4" /> Chiaro
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-md border bg-background text-sm font-medium hover:bg-muted text-muted-foreground">
                                    <Moon className="h-4 w-4" /> Scuro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="rounded-xl border bg-card p-6 shadow-sm border-amber-200/50">
                    <div className="flex items-center gap-3 mb-6 border-b pb-4">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Gestione Dati</h3>
                            <p className="text-sm text-muted-foreground">Esporta backup o ripristina lo stato iniziale.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-input bg-background hover:bg-muted font-medium transition-colors">
                            <Download className="h-4 w-4" /> Esporta Backup JSON
                        </button>
                        <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                            <Trash2 className="h-4 w-4" /> Reset Completo Dati
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                        Il reset pulirà il database mantenendo solo gli utenti amministratori.
                    </p>
                </div>
            </div>
        </div>
    );
}
