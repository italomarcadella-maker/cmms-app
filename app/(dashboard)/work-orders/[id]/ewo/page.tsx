"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle, FileText, CheckCircle2, Wand2, Printer, Wrench, Microscope, Camera, Timer, Factory, Box, Trash2, Users, Settings, Package, BookOpen, Ruler, ThermometerSun, PlusCircle, MinusCircle, Calculator, CalendarPlus } from "lucide-react";
import { getEWO, submitEWO, getSpareParts, createPreventiveFromEWO } from "@/lib/actions";
import { generateEWOAnalysis } from "@/lib/ai-service";
import { cn } from "@/lib/utils";
import { BackToDashboardButton } from "@/components/ui/back-button";

// --- PREDEFINED OPTIONS ---
const ISHIKAWA_CATEGORIES = [
    { id: "machine", title: "Macchina", icon: <Settings className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50/50", border: "border-blue-200", defaultTags: ["Usura", "Rottura Meccanica", "Guasto Elettrico", "Guasto Pneumatico/Idraulico"] },
    { id: "man", title: "Uomo", icon: <Users className="h-5 w-5" />, color: "text-orange-600", bg: "bg-orange-50/50", border: "border-orange-200", defaultTags: ["Errore Operativo", "Mancanza Addestramento", "Disattenzione", "Velocità eccessiva"] },
    { id: "method", title: "Metodo", icon: <BookOpen className="h-5 w-5" />, color: "text-purple-600", bg: "bg-purple-50/50", border: "border-purple-200", defaultTags: ["Procedura Errata", "Procedura Mancante", "Set-up Errato", "Standard non chiaro"] },
    { id: "material", title: "Materiale", icon: <Package className="h-5 w-5" />, color: "text-amber-600", bg: "bg-amber-50/50", border: "border-amber-200", defaultTags: ["Difetto di Fabbrica", "Materiale Scadente", "Specifiche Errate", "Usura Anomala"] },
    { id: "measurement", title: "Misura", icon: <Ruler className="h-5 w-5" />, color: "text-emerald-600", bg: "bg-emerald-50/50", border: "border-emerald-200", defaultTags: ["Sensore Guasto", "Taratura Errata", "Tolleranza Errata", "Strumento Inadeguato"] },
    { id: "environment", title: "Ambiente", icon: <ThermometerSun className="h-5 w-5" />, color: "text-cyan-600", bg: "bg-cyan-50/50", border: "border-cyan-200", defaultTags: ["Temperatura", "Umidità", "Polvere/Sporcizia", "Vibrazioni/Rumore"] }
];

const COMMON_SOLUTIONS = [
    { id: "sostituzione", label: "Sostituzione Componente", icon: "🔄" },
    { id: "riparazione", label: "Riparazione / Saldatura", icon: "🛠️" },
    { id: "pulizia", label: "Pulizia Approfondita", icon: "✨" },
    { id: "regolazione", label: "Regolazione / Taratura", icon: "🎚️" },
    { id: "ripristino", label: "Reset / Riavvio", icon: "🔁" },
    { id: "lubrificazione", label: "Lubrificazione", icon: "🛢️" },
    { id: "modifica", label: "Modifica Impianto", icon: "🏗️" },
    { id: "altro", label: "Altro (Specifica)", icon: "📝" },
];

const IMPACT_LEVELS = [
    { id: "NONE", label: "Nessuno (Impianto in marcia)", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    { id: "SLOWDOWN", label: "Rallentamento / Marcia Degradata", color: "bg-amber-100 text-amber-800 border-amber-200" },
    { id: "STOPPAGE", label: "FERMO IMPIANTO TOTALE", color: "bg-red-100 text-red-800 border-red-200 animate-pulse" },
];

export default function EWOFormPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isViewMode, setIsViewMode] = useState(false);
    const router = useRouter();

    // Data State
    const [formData, setFormData] = useState({
        description: "",
        causeAnalysis: "",
        solutionApplied: "",
        preventiveActions: "",
        needsFollowUp: false,
        followUpDetail: "",
        downtimeStart: "",
        downtimeEnd: "",
        productionImpact: "NONE",
        imageBefore: "",
        imageAfter: ""
    });

    // Parts State
    const [availableParts, setAvailableParts] = useState<any[]>([]);
    const [selectedPartId, setSelectedPartId] = useState("");
    const [partQuantity, setPartQuantity] = useState(1);
    const [partsConsumed, setPartsConsumed] = useState<{ partId: string, name: string, quantity: number }[]>([]);

    // Selection State
    // Selection State
    const [ishikawaData, setIshikawaData] = useState<Record<string, { tags: string[], notes: string }>>({
        machine: { tags: [], notes: "" },
        man: { tags: [], notes: "" },
        method: { tags: [], notes: "" },
        material: { tags: [], notes: "" },
        measurement: { tags: [], notes: "" },
        environment: { tags: [], notes: "" }
    });

    // 5 Whys State
    const [whys, setWhys] = useState<string[]>([""]);

    const [legacyCauseDetails, setLegacyCauseDetails] = useState("");
    const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
    const [solutionDetails, setSolutionDetails] = useState("");

    // Cost State
    const technicianHourlyRate = 45; // Fixed rate for MVP

    // Preventive State
    const [generatingPreventive, setGeneratingPreventive] = useState(false);
    const [preventiveFrequency, setPreventiveFrequency] = useState("MONTHLY");
    const [preventiveFrequencyDays, setPreventiveFrequencyDays] = useState(30);

    useEffect(() => {
        Promise.all([
            getEWO(id),
            getSpareParts()
        ]).then(([data, parts]) => {
            setAvailableParts(parts);
            if (data) {
                setFormData({
                    description: data.description || "",
                    causeAnalysis: data.causeAnalysis || "",
                    solutionApplied: data.solutionApplied || "",
                    preventiveActions: data.preventiveActions || "",
                    needsFollowUp: data.needsFollowUp || false,
                    followUpDetail: data.followUpDetail || "",
                    downtimeStart: data.downtimeStart ? new Date(data.downtimeStart).toISOString().slice(0, 16) : "",
                    downtimeEnd: data.downtimeEnd ? new Date(data.downtimeEnd).toISOString().slice(0, 16) : "",
                    productionImpact: data.productionImpact || "NONE",
                    imageBefore: data.imageBefore || "",
                    imageAfter: data.imageAfter || ""
                });

                // Parse selections
                // Parse Ishikawa or legacy cause text
                let parsedIshikawa = false;
                if (data.causeAnalysis && data.causeAnalysis.startsWith("{")) {
                    try {
                        const parsed = JSON.parse(data.causeAnalysis);
                        if (parsed.machine || parsed.man) {
                            // Extract whys if they exist in the root of the parsed object
                            if (parsed.whys && Array.isArray(parsed.whys)) {
                                setWhys(parsed.whys);
                                delete parsed.whys; // Remove from ishikawa mapping
                            }

                            // Merge with default to ensure all keys exist
                            setIshikawaData(prev => ({ ...prev, ...parsed }));
                            parsedIshikawa = true;
                        }
                    } catch (e) {
                        console.warn("Valid JSON but not Ishikawa format, fallback to legacy");
                    }
                }

                if (!parsedIshikawa) {
                    setLegacyCauseDetails(data.causeAnalysis || "");
                }

                const loadedSolutions = data.solutionApplied?.split(", ") || [];
                const matchedSolutions = COMMON_SOLUTIONS.filter(s => loadedSolutions.includes(s.label)).map(s => s.id);
                setSelectedSolutions(matchedSolutions);
                setSolutionDetails(loadedSolutions.filter(s => !COMMON_SOLUTIONS.find(ss => ss.label === s)).join(", "));

                setIsViewMode(true);
            }
            setInitialLoading(false);
        });
    }, [id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageBefore' | 'imageAfter') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const addPart = () => {
        if (!selectedPartId) return;
        const part = availableParts.find(p => p.id === selectedPartId);
        if (part) {
            setPartsConsumed(prev => [...prev, { partId: part.id, name: part.name, quantity: partQuantity }]);
            setSelectedPartId("");
            setPartQuantity(1);
        }
    };

    const removePartMetric = (index: number) => {
        setPartsConsumed(prev => prev.filter((_, i) => i !== index));
    };

    const toggleIshikawaTag = (category: string, tag: string) => {
        if (isViewMode) return;
        setIshikawaData(prev => {
            const catData = prev[category] || { tags: [], notes: "" };
            const newTags = catData.tags.includes(tag)
                ? catData.tags.filter(t => t !== tag)
                : [...catData.tags, tag];
            return { ...prev, [category]: { ...catData, tags: newTags } };
        });
    };

    const updateIshikawaNotes = (category: string, notes: string) => {
        if (isViewMode) return;
        setIshikawaData(prev => ({
            ...prev,
            [category]: { ...(prev[category] || { tags: [], notes: "" }), notes }
        }));
    };

    const addWhy = () => {
        if (isViewMode || whys.length >= 5) return;
        setWhys([...whys, ""]);
    };

    const removeWhy = (index: number) => {
        if (isViewMode || whys.length <= 1) return;
        setWhys(whys.filter((_, i) => i !== index));
    };

    const updateWhy = (index: number, value: string) => {
        if (isViewMode) return;
        const newWhys = [...whys];
        newWhys[index] = value;
        setWhys(newWhys);
    };

    const toggleSelection = (list: string[], setList: (l: string[]) => void, id: string) => {
        if (isViewMode) return;
        if (list.includes(id)) {
            setList(list.filter(item => item !== id));
        } else {
            setList([...list, id]);
        }
    };

    const handleAIAnalysis = async () => {
        if (!formData.description) {
            alert("Inserisci una descrizione del guasto per avviare l'analisi AI.");
            return;
        }
        setAiLoading(true);
        try {
            const result = await generateEWOAnalysis(formData.description);

            // Try to auto-tag based on AI text
            const aiTextLC = result.causeAnalysis.toLowerCase();
            let tagged = false;

            setIshikawaData(prev => {
                const newData = { ...prev };
                ISHIKAWA_CATEGORIES.forEach(cat => {
                    cat.defaultTags.forEach(tag => {
                        const tagLC = tag.toLowerCase();
                        if (aiTextLC.includes(tagLC) || aiTextLC.includes(tagLC.split(' ')[0])) {
                            if (!newData[cat.id].tags.includes(tag)) {
                                newData[cat.id].tags = [...newData[cat.id].tags, tag];
                                tagged = true;
                            }
                        }
                    });
                });
                return newData;
            });

            if (tagged) {
                setLegacyCauseDetails(prev => (prev ? prev + "\n" : "") + "--- AI TEXT ---\n" + result.causeAnalysis);
            } else {
                setLegacyCauseDetails(prev => (prev ? prev + "\n" : "") + "--- AI ANALYSIS ---\n" + result.causeAnalysis);
            }

            setSolutionDetails(prev => (prev ? prev + "\nAI: " : "") + result.solutionApplied);
            setFormData(prev => ({
                ...prev,
                preventiveActions: result.preventiveActions
            }));
        } catch (e) {
            console.error(e);
            alert("Errore AI.");
        } finally {
            setAiLoading(false);
        }
    };

    const calculateDowntime = () => {
        if (!formData.downtimeStart || !formData.downtimeEnd) return 0;
        const start = new Date(formData.downtimeStart);
        const end = new Date(formData.downtimeEnd);
        const diff = (end.getTime() - start.getTime()) / 1000 / 60; // minutes
        return diff > 0 ? Math.round(diff) : 0;
    };

    const calculateTotalCost = () => {
        const partsCost = partsConsumed.reduce((acc, p) => {
            const partObj = availableParts.find(ap => ap.id === p.partId);
            return acc + (p.quantity * (partObj?.unitCost || 0));
        }, 0);

        const downtimeMinutes = calculateDowntime();
        const laborCost = (downtimeMinutes / 60) * technicianHourlyRate;

        return {
            parts: partsCost,
            labor: laborCost,
            total: partsCost + laborCost
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Combine selections and details into final string
        // Serialize Ishikawa JSON string for db, including whys
        const causesJSON = JSON.stringify({ ...ishikawaData, whys: whys.filter(w => w.trim() !== "") });
        // Include legacy details if present so no data is lost
        const finalCauseString = legacyCauseDetails ? causesJSON + "|||" + legacyCauseDetails : causesJSON;

        const solutions = [
            ...COMMON_SOLUTIONS.filter(s => selectedSolutions.includes(s.id)).map(s => s.label),
            solutionDetails
        ].filter(Boolean).join(", ");

        if (!confirm("Confermi la registrazione dell'EWO?")) return;

        setLoading(true);
        try {
            const res = await submitEWO({
                workOrderId: id,
                ...formData,
                causeAnalysis: finalCauseString,
                solutionApplied: solutions,
                totalDowntimeMin: calculateDowntime(),
                partsConsumed // Pass parts to backend
            });

            if (res.success) {
                alert(res.message);
                router.push(`/work-orders/${id}`);
                router.refresh();
            } else {
                alert("Errore: " + res.message);
            }
        } catch (error) {
            console.error(error);
            alert("Errore imprevisto.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate preventive action
    const handleCreatePreventive = async () => {
        if (!formData.preventiveActions) {
            alert("Scrivi prima l'azione preventiva da generare.");
            return;
        }

        setGeneratingPreventive(true);
        try {
            // Need to lookup assetId for this WO - currently not in EWO context directly, let's fetch it or let the server handle via WO ID
            // For MVP, we pass dummy asset if we don't have it, but wait EWO forms are nested: /work-orders/[id]/ewo
            const woInfo = await getEWO(id); // Re-fetch to get assetId relation?
            // Actually getEWO returns only EWO. We need the WorkOrder.
            // A better way is server action takes workOrderId and figures it out internally if assetId isn't provided.

            const res = await createPreventiveFromEWO(
                id,
                "auto-resolve-in-server", // We'll alter the server action to lookup WO asset
                "Azione da EWO #" + id,
                formData.preventiveActions,
                preventiveFrequency,
                preventiveFrequencyDays
            );

            if (res.success) {
                alert("Piano preventivo creato con successo!");
            } else {
                alert("Errore: " + res.message);
            }
        } catch (e) {
            console.error(e);
            alert("Errore creazione piano preventivo.");
        } finally {
            setGeneratingPreventive(false);
        }
    }

    if (initialLoading) return <div className="p-8 text-center print:hidden">Caricamento modulo EWO...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in py-6 print:py-0 print:max-w-none print:bg-white print:text-black">
            <style jsx global>{`
                @media print {
                    header, aside, .bottom-nav, .no-print { display: none !important; }
                    body { background: white; color: black; }
                    .print-visible { display: block !important; }
                    input, textarea, select { border: none !important; appearance: none; background: white !important; color: black !important; }
                    .print-hidden { display: none !important; }
                }
            `}</style>

            <div className="print:hidden">
                <BackToDashboardButton />
            </div>

            <div className="flex items-center justify-between mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                            EWO Evoluto
                        </h1>
                        <p className="text-muted-foreground">Analisi Guasto, Costi e Impatto #{id}</p>
                    </div>
                </div>
                {isViewMode && (
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium">
                        <Printer className="h-4 w-4" /> Stampa PDF
                    </button>
                )}
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold mb-2">EWO - Rapporto Emergenza</h1>
                <p className="text-lg">Riferimento Ordine: #{id}</p>
                <p className="text-sm">Stampato il: {new Date().toLocaleDateString()}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. IMPATTO & DOWNTIME */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-red-600">
                        <Timer className="h-5 w-5" />
                        Impatto Operativo
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Livello Impatto Produzione</label>
                            <div className="flex flex-col gap-2">
                                {IMPACT_LEVELS.map(lvl => (
                                    <label key={lvl.id} className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                        formData.productionImpact === lvl.id ? `ring-2 ring-offset-1 ${lvl.color}` : "hover:bg-muted"
                                    )}>
                                        <input
                                            type="radio"
                                            name="impact"
                                            value={lvl.id}
                                            disabled={isViewMode}
                                            checked={formData.productionImpact === lvl.id}
                                            onChange={e => setFormData({ ...formData, productionImpact: e.target.value })}
                                            className="h-4 w-4"
                                        />
                                        <span className="font-medium">{lvl.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Inizio Guasto</label>
                                    <input
                                        type="datetime-local"
                                        disabled={isViewMode}
                                        value={formData.downtimeStart}
                                        onChange={e => setFormData({ ...formData, downtimeStart: e.target.value })}
                                        className="w-full p-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Fine Intervento</label>
                                    <input
                                        type="datetime-local"
                                        disabled={isViewMode}
                                        value={formData.downtimeEnd}
                                        onChange={e => setFormData({ ...formData, downtimeEnd: e.target.value })}
                                        className="w-full p-2 border rounded-md"
                                    />
                                </div>
                            </div>

                            {/* NEW: REALTIME COST CARD */}
                            <div className="p-4 bg-slate-50 rounded-lg flex flex-col gap-3 border">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-600 flex items-center gap-2"><Timer className="h-4 w-4" /> Fermo Macchina:</span>
                                    <span className="text-lg font-bold font-mono">{calculateDowntime()} min</span>
                                </div>
                                <div className="h-px bg-slate-200" />
                                <div className="flex flex-col gap-1 text-sm">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Costo Ricambi:</span>
                                        <span>€ {calculateTotalCost().parts.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Costo Manodopera ({technicianHourlyRate}€/h):</span>
                                        <span>€ {calculateTotalCost().labor.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-800 mt-1 pt-1 border-t">
                                        <span className="flex items-center gap-1"><Calculator className="h-4 w-4" /> Costo Evento Totale:</span>
                                        <span className="text-red-600">€ {calculateTotalCost().total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. DESCRIZIONE & FOTO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-card border rounded-xl p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                            <FileText className="h-5 w-5" />
                            Descrizione Evento
                        </h3>
                        <div className="relative">
                            <textarea
                                required
                                disabled={isViewMode}
                                className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Descrivi dettagliatamente cosa è successo..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                            {!isViewMode && (
                                <button
                                    type="button"
                                    onClick={handleAIAnalysis}
                                    disabled={aiLoading || !formData.description}
                                    className="absolute right-2 bottom-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200 flex items-center gap-1 font-medium transition-colors"
                                >
                                    <Wand2 className="h-3 w-3" />
                                    {aiLoading ? "..." : "AI Help"}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-purple-600">
                            <Camera className="h-5 w-5" />
                            Foto
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Prima (Guasto)</label>
                                {formData.imageBefore ? (
                                    <img src={formData.imageBefore} alt="Before" className="w-full h-32 object-cover rounded-md border" />
                                ) : (
                                    <input type="file" disabled={isViewMode} accept="image/*" onChange={e => handleFileChange(e, 'imageBefore')} className="text-xs" />
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Dopo (Soluzione)</label>
                                {formData.imageAfter ? (
                                    <img src={formData.imageAfter} alt="After" className="w-full h-32 object-cover rounded-md border" />
                                ) : (
                                    <input type="file" disabled={isViewMode} accept="image/*" onChange={e => handleFileChange(e, 'imageAfter')} className="text-xs" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. ISHIKAWA (6M) - ROOT CAUSE ANALYSIS */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                            <Microscope className="h-5 w-5" />
                            Analisi Cause Radice (Ishikawa)
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ISHIKAWA_CATEGORIES.map(cat => (
                            <div key={cat.id} className={cn("border rounded-lg p-4 flex flex-col gap-3", cat.bg, cat.border)}>
                                <div className={cn("flex items-center gap-2 font-semibold", cat.color)}>
                                    {cat.icon}
                                    {cat.title}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {cat.defaultTags.map(tag => {
                                        const isSelected = ishikawaData[cat.id]?.tags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                disabled={isViewMode}
                                                onClick={() => toggleIshikawaTag(cat.id, tag)}
                                                className={cn(
                                                    "text-xs px-2 py-1 rounded-full border transition-colors",
                                                    isSelected
                                                        ? `${cat.color} border-${cat.color.split('-')[1] || 'current'}-400 bg-white shadow-sm font-medium`
                                                        : "bg-white/50 text-slate-600 hover:bg-white border-transparent hover:border-slate-200"
                                                )}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>

                                <input
                                    type="text"
                                    disabled={isViewMode}
                                    placeholder={`Altre cause relative a ${cat.title.toLowerCase()}...`}
                                    className="w-full text-xs p-2 rounded-md border-white/60 bg-white/70 focus:bg-white/90 focus:ring-1 transition-all mt-auto"
                                    value={ishikawaData[cat.id]?.notes || ""}
                                    onChange={e => updateIshikawaNotes(cat.id, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    {legacyCauseDetails && (
                        <div className="mt-4">
                            <label className="text-sm font-medium text-slate-700 block mb-1">Note Aggiuntive / Storico Cause / AI</label>
                            <textarea
                                disabled={isViewMode}
                                className="w-full p-3 text-sm border rounded-md bg-slate-50"
                                rows={3}
                                value={legacyCauseDetails}
                                onChange={e => setLegacyCauseDetails(e.target.value)}
                            />
                        </div>
                    )}

                    {/* NEW: 5 WHYS SECTION */}
                    <div className="mt-6 pt-4 border-t">
                        <h4 className="font-semibold text-md text-slate-800 mb-3 flex items-center justify-between">
                            Metodo dei 5 Perché (5 Whys)
                            {!isViewMode && whys.length < 5 && (
                                <button type="button" onClick={addWhy} className="text-xs flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200">
                                    <PlusCircle className="h-3 w-3" /> Aggiungi Perché
                                </button>
                            )}
                        </h4>

                        <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                            {whys.map((why, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <span className="text-sm font-bold text-slate-400 w-24 text-right shrink-0">
                                        {index + 1}° Perché?
                                    </span>
                                    <input
                                        disabled={isViewMode}
                                        type="text"
                                        className="flex-1 text-sm p-2 rounded-md border bg-white focus:bg-slate-50 focus:ring-1"
                                        placeholder={`Es. ${index === 0 ? 'Perché è saltato il fusibile?' : 'Perché ha lavorato sotto sforzo?'}`}
                                        value={why}
                                        onChange={e => updateWhy(index, e.target.value)}
                                    />
                                    {!isViewMode && whys.length > 1 && (
                                        <button type="button" onClick={() => removeWhy(index)} className="p-2 text-slate-400 hover:text-red-500 rounded">
                                            <MinusCircle className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3b. INTERVENTO ESEGUITO */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-emerald-600">
                        <Wrench className="h-5 w-5" />
                        Intervento Eseguito / Soluzione
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {COMMON_SOLUTIONS.map(sol => (
                            <button
                                key={sol.id}
                                type="button"
                                disabled={isViewMode}
                                onClick={() => toggleSelection(selectedSolutions, setSelectedSolutions, sol.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition-all hover:bg-muted/50",
                                    selectedSolutions.includes(sol.id) ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-background"
                                )}
                            >
                                <span className="text-lg mb-1">{sol.icon}</span>
                                <span className="text-xs font-medium text-center">{sol.label}</span>
                            </button>
                        ))}
                    </div>
                    <input
                        disabled={isViewMode}
                        placeholder="Dettagli intervento... Es. Sostituzione cuscinetto SKF"
                        className="w-full p-3 text-sm border rounded-md bg-background"
                        value={solutionDetails}
                        onChange={e => setSolutionDetails(e.target.value)}
                    />
                </div>

                {/* 4. RICAMBI (NEW) */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-orange-600">
                        <Box className="h-5 w-5" />
                        Ricambi Utilizzati
                    </h3>

                    {!isViewMode && (
                        <div className="flex gap-2 items-end bg-muted/20 p-4 rounded-lg">
                            <div className="flex-1">
                                <label className="text-xs font-medium block mb-1">Seleziona Ricambio</label>
                                <select
                                    className="w-full p-2 border rounded-md text-sm"
                                    value={selectedPartId}
                                    onChange={e => setSelectedPartId(e.target.value)}
                                >
                                    <option value="">-- Seleziona --</option>
                                    {availableParts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Disp: {p.quantity})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="text-xs font-medium block mb-1">Q.tà</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-2 border rounded-md text-sm"
                                    value={partQuantity}
                                    onChange={e => setPartQuantity(parseInt(e.target.value))}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={addPart}
                                className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700"
                            >
                                Aggiungi
                            </button>
                        </div>
                    )}

                    {partsConsumed.length > 0 ? (
                        <ul className="divide-y border rounded-md bg-white">
                            {partsConsumed.map((p, i) => (
                                <li key={i} className="flex items-center justify-between p-3 text-sm">
                                    <span><span className="font-bold">{p.quantity}x</span> {p.name}</span>
                                    {!isViewMode && (
                                        <button type="button" onClick={() => removePartMetric(i)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">Nessun ricambio registrato.</p>
                    )}
                </div>

                {/* 5. FUTURE ACTIONS */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
                        <CheckCircle2 className="h-5 w-5" />
                        Prevenzione
                    </h3>
                    <textarea
                        disabled={isViewMode}
                        className="w-full min-h-[60px] p-3 rounded-md border bg-background text-sm"
                        placeholder="Azioni preventive..."
                        value={formData.preventiveActions}
                        onChange={e => setFormData({ ...formData, preventiveActions: e.target.value })}
                    />
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg mt-2">
                        <input
                            type="checkbox"
                            checked={formData.needsFollowUp}
                            disabled={isViewMode}
                            onChange={e => setFormData({ ...formData, needsFollowUp: e.target.checked })}
                            className="mt-1 h-4 w-4"
                        />
                        <div className="flex-1">
                            <label className="font-medium text-sm">Richiedi Follow-up (Nuovo Ordine)</label>
                            {formData.needsFollowUp && (
                                <input
                                    type="text"
                                    disabled={isViewMode}
                                    className="w-full mt-2 p-2 rounded-md border text-sm"
                                    placeholder="Dettagli richiesta..."
                                    value={formData.followUpDetail}
                                    onChange={e => setFormData({ ...formData, followUpDetail: e.target.value })}
                                />
                            )}
                        </div>
                    </div>

                    {/* NEW: GENERATE PREVENTIVE PLAN */}
                    {!isViewMode && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mt-4 print:hidden">
                            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <div className="flex-1 space-y-1">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <CalendarPlus className="h-4 w-4 text-primary" /> Strategia a Lungo Termine
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Trasforma le azioni preventive scritte sopra in un programma ricorrente nel calendario del CMMS.
                                    </p>
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                    <select
                                        className="p-2 text-sm border rounded-md bg-white"
                                        value={preventiveFrequencyDays}
                                        onChange={e => {
                                            setPreventiveFrequencyDays(parseInt(e.target.value));
                                            setPreventiveFrequency(e.target.options[e.target.selectedIndex].text.toUpperCase());
                                        }}
                                    >
                                        <option value={7}>Settimanale</option>
                                        <option value={30}>Mensile</option>
                                        <option value={90}>Trimestrale</option>
                                        <option value={180}>Semestrale</option>
                                        <option value={365}>Manuale</option>
                                    </select>

                                    <button
                                        type="button"
                                        onClick={handleCreatePreventive}
                                        disabled={generatingPreventive || !formData.preventiveActions}
                                        className="whitespace-nowrap px-4 py-2 bg-white border shadow-sm text-primary font-medium rounded-md hover:bg-slate-50 text-sm disabled:opacity-50"
                                    >
                                        {generatingPreventive ? "Creazione..." : "Salva come Piano Ricorrente"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!isViewMode && (
                    <div className="sticky bottom-4 z-10 flex justify-end gap-3 print:hidden bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2 rounded-lg border bg-background hover:bg-muted font-medium"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                        >
                            {loading ? "Registrazione..." : <><Save className="h-4 w-4" /> REGISTRA EWO</>}
                        </button>
                    </div>
                )}

                {isViewMode && (
                    <div className="flex justify-end gap-4 print:hidden">
                        <button
                            type="button"
                            onClick={() => setIsViewMode(false)}
                            className="px-6 py-2 rounded-lg border bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium"
                        >
                            Modifica Dati
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
