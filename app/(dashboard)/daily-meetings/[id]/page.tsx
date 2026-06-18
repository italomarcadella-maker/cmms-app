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
import { AssetTree } from "@/components/assets/asset-tree";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getAssets } from "@/lib/actions";

export default function DailyMeetingWizard({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("SAFETY");
    const [saving, setSaving] = useState(false);
    const [meeting, setMeeting] = useState<any>(() => ({
        id,
        department: "Reparto 1",
        date: new Date().toISOString()
    }));
    const [assets, setAssets] = useState<any[]>([]);
    
    // Asset Picker State
    const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
    const [pendingCategory, setPendingCategory] = useState("");
    const [pendingDescription, setPendingDescription] = useState("");

    // Forms Content
    const [safetyNotes, setSafetyNotes] = useState("Nessun incidente segnalato.");
    const [qualityNotes, setQualityNotes] = useState("");
    const [productionNotes, setProductionNotes] = useState("");
    const [maintenanceNotes, setMaintenanceNotes] = useState("");

    // KPI Content
    const [oee, setOee] = useState(88);
    const [efficiency, setEfficiency] = useState(92);
    const [actionItems, setActionItems] = useState<any[]>([]);

    useEffect(() => {
        // In real app, fetch meeting status to see if it's already DRAFT or CLOSED
        
        // Fetch existing action items
        async function fetchActionItems() {
            try {
                const res = await fetch(`/api/daily-meetings/${id}/action-items`);
                if (res.ok) {
                    const data = await res.json();
                    setActionItems(data);
                }
            } catch (error) {
                console.error("Failed to fetch action items", error);
            }
        }
        fetchActionItems();

        async function fetchAssets() {
            const data = await getAssets();
            setAssets(data);
        }
        fetchAssets();
    }, [id]);

    const openAssetPicker = (category: string, description: string) => {
        setPendingCategory(category);
        setPendingDescription(description);
        setIsAssetPickerOpen(true);
    };

    const handleCreateTask = async (category: string, description: string, assetId?: string) => {
        try {
            const res = await fetch(`/api/daily-meetings/${id}/action-items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    category, 
                    description, 
                    priority: "HIGH",
                    assetId: assetId || "SYS-OTHER" // Default to general if not selected
                })
            });
            if (res.ok) {
                const newItem = await res.json();
                setActionItems(prev => [newItem, ...prev]);
                toast.success(`Task ${category} generato inviato alla Manutenzione!`);
                setIsAssetPickerOpen(false);
            }
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
                                    <Button variant="destructive" size="sm" onClick={() => openAssetPicker("SAFETY", safetyNotes)}>
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
                                    <Card className="flex-1 bg-indigo-50/50 border-indigo-200">
                                        <CardContent className="p-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <input
                                                    type="number"
                                                    value={oee}
                                                    onChange={(e) => setOee(Number(e.target.value))}
                                                    className="text-3xl font-bold text-indigo-700 bg-transparent border-none text-center focus:ring-0 w-20"
                                                />
                                                <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">OEE Stimato (%)</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="flex-1 bg-emerald-50/50 border-emerald-200">
                                        <CardContent className="p-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <input
                                                    type="number"
                                                    value={efficiency}
                                                    onChange={(e) => setEfficiency(Number(e.target.value))}
                                                    className="text-3xl font-bold text-emerald-700 bg-transparent border-none text-center focus:ring-0 w-20"
                                                />
                                                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Efficienza Target (%)</div>
                                            </div>
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
                                    <Button variant="secondary" size="sm" onClick={() => openAssetPicker("MECHANICAL", maintenanceNotes)}>
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

            {/* Right side: Follow-up */}
            <div className="w-full lg:w-[350px] space-y-4">
                
                <Card className="border-indigo-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-indigo-50/50 py-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                            <Activity className="h-4 w-4" /> Follow-up Attività
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {actionItems.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400 italic">
                                    Nessun task generato in questa sessione.
                                </div>
                            ) : (
                                actionItems.map((item: any) => (
                                    <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border 
                                                ${item.status === 'OPEN' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                                {item.status}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-700 line-clamp-2">{item.description}</p>
                                        {item.linkedWorkOrderId && (
                                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                                                <Wrench className="h-3 w-3" /> Collegato WO
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Asset Selection Dialog */}
            <Dialog open={isAssetPickerOpen} onOpenChange={setIsAssetPickerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Seleziona l'Asset per la richiesta</DialogTitle>
                        <DialogDescription>
                            Sfoglia l'albero degli asset per indicare con precisione dove intervenire.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto pr-2">
                        <AssetTree 
                            assets={assets} 
                            onEdit={(e, asset) => {
                                e.stopPropagation();
                                handleCreateTask(pendingCategory, pendingDescription, asset.id);
                            }}
                            onDelete={() => {}} 
                            canManage={false}
                        />
                    </div>
                    
                    <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6">
                        <Button variant="outline" onClick={() => handleCreateTask(pendingCategory, pendingDescription)}>
                            Salta e usa Asset Generico
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
