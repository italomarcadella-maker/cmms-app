"use client";

import { Save, User, Globe, AlertTriangle, Download, Trash2, Bell, Shield, Server, Plug, Smartphone, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { resetDatabase } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function SettingsPage() {
    const router = useRouter();

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
        toast.success("Backup esportato correttamente");
    };

    const handleReset = async () => {
        if (confirm("Sei sicuro di voler cancellare TUTTI i dati? Questa azione è irreversibile e cancellerà Ordini, Asset, Tecnici e Utenti non-admin.")) {
            try {
                const result = await resetDatabase();
                if (result.success) {
                    toast.success(result.message);
                    router.refresh();
                } else {
                    toast.error(result.message);
                }
            } catch (e) {
                console.error(e);
                toast.error("Errore durante il reset.");
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Impostazioni
                </h1>
                <p className="text-muted-foreground mt-1">Gestisci la piattaforma, le preferenze utente e le configurazioni di sistema.</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="general">Generale</TabsTrigger>
                    <TabsTrigger value="notifications">Notifiche</TabsTrigger>
                    <TabsTrigger value="system">Sistema</TabsTrigger>
                    <TabsTrigger value="advanced" className="text-amber-600 data-[state=active]:text-amber-700">Avanzate</TabsTrigger>
                </TabsList>

                {/* --- GENERAL TAB --- */}
                <TabsContent value="general" className="space-y-6 mt-6">
                    {/* Profile Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profilo Utente</CardTitle>
                            <CardDescription>Gestisci le tue informazioni personali e aziendali.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome Azienda</Label>
                                    <Input defaultValue="My Factory S.p.A." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome Utente</Label>
                                    <Input defaultValue="Mario Rossi" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Aziendale</Label>
                                    <Input defaultValue="mario.rossi@factory.it" readOnly className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Lingua Interfaccia</Label>
                                    <Select defaultValue="it">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleziona lingua" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="it">Italiano</SelectItem>
                                            <SelectItem value="en">English (US)</SelectItem>
                                            <SelectItem value="de">Deutsch</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4 bg-muted/20">
                            <Button onClick={() => toast.success("Profilo aggiornato")} className="ml-auto">
                                <Save className="h-4 w-4 mr-2" /> Salva Modifiche
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Security Placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Sicurezza</CardTitle>
                            <CardDescription>Gestione password e accessi.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <div className="font-medium">Password</div>
                                    <div className="text-sm text-muted-foreground">Ultima modifica 30 giorni fa</div>
                                </div>
                                <Button variant="outline">Cambia Password</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- NOTIFICATIONS TAB --- */}
                <TabsContent value="notifications" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Preferenze Notifiche</CardTitle>
                            <CardDescription>Decidi come e quando essere avvisato.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Notifiche Push</Label>
                                    <p className="text-sm text-muted-foreground">Ricevi notifiche in tempo reale nel browser.</p>
                                </div>
                                <Switch defaultChecked onCheckedChange={() => toast("Impostazione salvata")} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Report Settimanale Email</Label>
                                    <p className="text-sm text-muted-foreground">Ricevi un riepilogo delle attività ogni lunedì.</p>
                                </div>
                                <Switch defaultChecked onCheckedChange={() => toast("Impostazione salvata")} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Allerte Critiche Asset</Label>
                                    <p className="text-sm text-muted-foreground">Notifica immediata se un asset va in stato CRITICAL.</p>
                                </div>
                                <Switch defaultChecked disabled title="Sempre attivo per la sicurezza" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- SYSTEM TAB --- */}
                <TabsContent value="system" className="space-y-6 mt-6">
                    <SchedulerTriggerSection />
                    <EWOSettingsSection />

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5" /> Integrazioni</CardTitle>
                            <CardDescription>Connessioni con sistemi esterni.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50/50 border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-full"><Server className="h-4 w-4 text-emerald-600" /></div>
                                    <div>
                                        <div className="font-medium">ERP Corporate</div>
                                        <div className="text-xs text-emerald-600 font-medium">CONNESSO</div>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" disabled>Configura</Button>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-100 p-2 rounded-full"><Smartphone className="h-4 w-4 text-gray-600" /></div>
                                    <div>
                                        <div className="font-medium">IoT Gateway</div>
                                        <div className="text-xs text-muted-foreground">NON CONNESSO</div>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">Connetti</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ADVANCED TAB --- */}
                <TabsContent value="advanced" className="space-y-6 mt-6">
                    <Card className="border-amber-200 bg-amber-50/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-5 w-5" /> Zona Pericolo</CardTitle>
                            <CardDescription>Azioni che possono comportare perdita di dati.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-amber-200 bg-white rounded-lg">
                                <div>
                                    <div className="font-medium">Esporta Backup Completo</div>
                                    <div className="text-sm text-muted-foreground">Scarica un file JSON con tutti i dati del sistema.</div>
                                </div>
                                <Button onClick={handleExport} variant="outline" className="border-amber-200 hover:bg-amber-50">
                                    <Download className="h-4 w-4 mr-2" /> Esporta Dati
                                </Button>
                            </div>

                            <Separator className="bg-amber-200/50" />

                            <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50/30 rounded-lg">
                                <div>
                                    <div className="font-medium text-red-700">Factory Reset</div>
                                    <div className="text-sm text-red-600/80">Cancella tutti i dati operativi (ordini, asset, etc). Mantiene gli admin.</div>
                                </div>
                                <Button onClick={handleReset} variant="destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Reset Totale
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EWOSettingsSection() {
    const [threshold, setThreshold] = useState<number>(0);

    useEffect(() => {
        import("@/lib/actions").then(async (mod) => {
            const s = await mod.getSystemSettings();
            if (s) setThreshold(s.ewoThresholdHours);
        });
    }, []);

    const handleSave = async () => {
        const { updateSystemSettings } = await import("@/lib/actions");
        const res = await updateSystemSettings(threshold);
        toast.success(res.message);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600">
                    <AlertTriangle className="h-5 w-5" /> Configurazione EWO
                </CardTitle>
                <CardDescription>Regole per l'apertura automatica di Emergency Work Order.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label>Soglia Ore Intervento</Label>
                    <div className="flex gap-4">
                        <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-32"
                        />
                        <div className="flex-1 text-sm text-muted-foreground self-center">
                            ore. Se superata, l'ordine richiede EWO obbligatorio. (0 = Disabilitato)
                        </div>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Aggiorna Regola
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function SchedulerTriggerSection() {
    const [loading, setLoading] = useState(false);

    const handleRunScheduler = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/scheduler/run');
            const data = await res.json();
            if (data.success) {
                toast.success(`Controllo completato: ${data.count} ordini generati.`);
            } else {
                toast.error(`Errore: ${data.error}`);
            }
        } catch (e) {
            toast.error("Errore di connessione al server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Manutenzione Programmata</CardTitle>
                <CardDescription>Gestione del motore di schedulazione preventiva.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div>
                    <div className="font-medium">Esecuzione Manuale</div>
                    <div className="text-sm text-muted-foreground">Forza il controllo delle scadenze e genera gli ordini di lavoro dovuti.</div>
                </div>
                <Button onClick={handleRunScheduler} disabled={loading} variant="secondary">
                    {loading ? "Esecuzione in corso..." : "Esegui Controllo Ora"}
                </Button>
            </CardContent>
        </Card>
    );
}
