"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/text-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, AlertTriangle, Activity, Wrench, ChevronLeft, ChevronRight, Save, Play, Printer } from "lucide-react";
import { toast } from "sonner";
import { AiDailyBriefing } from "@/components/daily/ai-daily-briefing";

export default function DailyMeetingWizard({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("SAFETY");
    const [saving, setSaving] = useState(false);
    const [meeting, setMeeting] = useState<any>(null);

    // Forms Content
    const [safetyNotes, setSafetyNotes] = useState("Nessun incidente segnalato.");
    const [qualityNotes, setQualityNotes] = useState("");
    const [productionNotes, setProductionNotes] = useState("");
    const [maintenanceNotes, setMaintenanceNotes] = useState("");

    useEffect(() => {
        // In real app, fetch meeting status to see if it's already DRAFT or CLOSED
        // Mocking an initial fetch
        setMeeting({ id, department: "Reparto 1", date: new Date().toISOString() });
    }, [id]);

    const handleCreateTask = async (category: string, description: string) => {
        try {
            await fetch(`/api/daily-meetings/${id}/action-items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, description, priority: "HIGH" })
            });
            toast.success(`Task ${category} generato inviato alla Manutenzione!`);
        } catch (e) {
            toast.error("Errore generazione Task");
        }
    }

    const handleComplete = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(r => setTimeout(r, 1000));
        toast.success("Meeting salvato con successo.");
        router.push("/daily-meetings");
    };

    if (!meeting) return <div>Caricamento...</div>;

    return (
        <div className="flex flex-col lg:flex-row gap-6">

            {/* Left side: The Wizard */}
            <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4 mb-2">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Daily Meeting - {meeting.department}</h1>
                        <p className="text-muted-foreground text-sm">Sessione in bozza - Compila le sezioni.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-12">
                        <TabsTrigger value="SAFETY" className="gap-2"><ShieldCheck className="h-4 w-4" /> Sicurezza</TabsTrigger>
                        <TabsTrigger value="QUALITY" className="gap-2"><AlertTriangle className="h-4 w-4" /> Qualità</TabsTrigger>
                        <TabsTrigger value="PRODUCTION" className="gap-2"><Activity className="h-4 w-4" /> Produzione</TabsTrigger>
                        <TabsTrigger value="MAINTENANCE" className="gap-2"><Wrench className="h-4 w-4" /> Manutenzione</TabsTrigger>
                    </TabsList>

                    {/* SAFETY TAB */}
                    <TabsContent value="SAFETY" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Salute, Sicurezza e Ambiente (HSE)</CardTitle>
                                <CardDescription>Eventi mancati, infortuni, o problemi di sicurezza (DPI).</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    rows={5}
                                    placeholder="Annota eventi relativi alla sicurezza..."
                                    value={safetyNotes}
                                    onChange={(e) => setSafetyNotes(e.target.value)}
                                />
                                <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                                    <span className="text-sm">È richiesto un intervento urgente di Manutenzione per ripristinare la Sicurezza?</span>
                                    <Button variant="destructive" size="sm" onClick={() => handleCreateTask("SAFETY", safetyNotes)}>
                                        Genera Ticket Emergenza (EWO)
                                    </Button>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="ghost" disabled>Indietro</Button>
                                <Button onClick={() => setActiveTab("QUALITY")}>Avanti <ChevronRight className="ml-2 h-4 w-4" /></Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* QUALITY TAB */}
                    <TabsContent value="QUALITY" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Qualità e Non Conformità</CardTitle>
                                <CardDescription>Rese, reclami, scarti o blocchi del magazzino.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Scarti Totali (kg)</label>
                                        <Input type="number" placeholder="Es. 120" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Non Conformità Aperte</label>
                                        <Input type="number" placeholder="Es. 2" />
                                    </div>
                                </div>
                                <Textarea
                                    rows={4}
                                    placeholder="Dettagli di qualità discussi oggi..."
                                    value={qualityNotes}
                                    onChange={(e) => setQualityNotes(e.target.value)}
                                />
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={() => setActiveTab("SAFETY")}>Indietro</Button>
                                <Button onClick={() => setActiveTab("PRODUCTION")}>Avanti <ChevronRight className="ml-2 h-4 w-4" /></Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* PRODUCTION TAB */}
                    <TabsContent value="PRODUCTION" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Avanzamento Produzione</CardTitle>
                                <CardDescription>KPI OEE, fermi linea, andamenti.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-4">
                                    <Card className="flex-1 bg-indigo-50/50">
                                        <CardContent className="p-4 text-center">
                                            <div className="text-3xl font-bold text-indigo-700">88%</div>
                                            <div className="text-xs text-muted-foreground uppercase">OEE Stimato Ieri</div>
                                        </CardContent>
                                    </Card>
                                    <Card className="flex-1 bg-emerald-50/50">
                                        <CardContent className="p-4 text-center">
                                            <div className="text-3xl font-bold text-emerald-700">92%</div>
                                            <div className="text-xs text-muted-foreground uppercase">Efficienza Target</div>
                                        </CardContent>
                                    </Card>
                                </div>
                                <Textarea
                                    rows={4}
                                    placeholder="Problemi sui materiali, cambi formato lenti, ecc..."
                                    value={productionNotes}
                                    onChange={(e) => setProductionNotes(e.target.value)}
                                />
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={() => setActiveTab("QUALITY")}>Indietro</Button>
                                <Button onClick={() => setActiveTab("MAINTENANCE")}>Avanti <ChevronRight className="ml-2 h-4 w-4" /></Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* MAINTENANCE TAB */}
                    <TabsContent value="MAINTENANCE" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Integrazione Manutenzione</CardTitle>
                                <CardDescription>Problemi tecnici sollevati oggi che richiedono interventi.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    rows={4}
                                    placeholder="Descrivi richieste e collaudi (es. sensore guasto sulla formatrice)..."
                                    value={maintenanceNotes}
                                    onChange={(e) => setMaintenanceNotes(e.target.value)}
                                />
                                <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
                                    <span className="text-sm">Assegna un Task preventivo o curativo per quanto descritto sopra.</span>
                                    <Button variant="secondary" size="sm" onClick={() => handleCreateTask("MECHANICAL", maintenanceNotes)}>
                                        <Wrench className="mr-2 h-4 w-4" /> Genera Ordine (WO)
                                    </Button>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={() => setActiveTab("PRODUCTION")}>Indietro</Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => window.open(`/daily-meetings/${id}/report`, "_blank")}>
                                        <Printer className="mr-2 h-4 w-4" /> Genera PDF
                                    </Button>
                                    <Button onClick={handleComplete} disabled={saving} className="bg-green-600 hover:bg-green-700">
                                        {saving ? "Salvataggio..." : <><Save className="mr-2 h-4 w-4" /> Chiudi ed Archivia</>}
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right side: AI Panel */}
            <div className="w-full lg:w-[350px]">
                <AiDailyBriefing meetingId={id} />
            </div>
        </div>
    );
}
