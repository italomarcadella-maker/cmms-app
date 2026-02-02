"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle, FileText, CheckCircle2, Wand2, Printer, Wrench, Microscope, Camera, Timer, Factory, Box, Trash2 } from "lucide-react";
import { getEWO, submitEWO, getSpareParts } from "@/lib/actions";
import { generateEWOAnalysis } from "@/lib/ai-service";
import { cn } from "@/lib/utils";
import { BackToDashboardButton } from "@/components/ui/back-button";

// --- PREDEFINED OPTIONS ---
const COMMON_CAUSES = [
    { id: "cura", label: "Usura / Invecchiamento", icon: "⏳" },
    { id: "rottura", label: "Rottura Meccanica", icon: "⚙️" },
    { id: "elettrico", label: "Guasto Elettrico", icon: "⚡" },
    { id: "sporcizia", label: "Sporcizia / Intasamento", icon: "🧹" },
    { id: "operatore", label: "Errore Operativo", icon: "👤" },
    { id: "materiale", label: "Difetto Materiale", icon: "📦" },
    { id: "software", label: "Software / Parametri", icon: "💻" },
    { id: "idraulico", label: "Guasto Idraulico", icon: "💧" },
    { id: "pneumatico", label: "Guasto Pneumatico", icon: "💨" },
    { id: "altro", label: "Altro (Specifica)", icon: "📝" },
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

export default function EWOFormPage({ params }: { params: { id: string } }) {
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
    const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
    const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
    const [causeDetails, setCauseDetails] = useState("");
    const [solutionDetails, setSolutionDetails] = useState("");

    useEffect(() => {
        Promise.all([
            getEWO(params.id),
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
                const loadedCauses = data.causeAnalysis?.split(", ") || [];
                const matchedCauses = COMMON_CAUSES.filter(c => loadedCauses.includes(c.label)).map(c => c.id);
                setSelectedCauses(matchedCauses);
                setCauseDetails(loadedCauses.filter(c => !COMMON_CAUSES.find(cc => cc.label === c)).join(", "));

                const loadedSolutions = data.solutionApplied?.split(", ") || [];
                const matchedSolutions = COMMON_SOLUTIONS.filter(s => loadedSolutions.includes(s.label)).map(s => s.id);
                setSelectedSolutions(matchedSolutions);
                setSolutionDetails(loadedSolutions.filter(s => !COMMON_SOLUTIONS.find(ss => ss.label === s)).join(", "));

                setIsViewMode(true);
            }
            setInitialLoading(false);
        });
    }, [params.id]);

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
            // Append AI result to notes, don't overwrite user selections unless empty
            setCauseDetails(prev => (prev ? prev + "\nAI: " : "") + result.causeAnalysis);
            setSolutionDetails(prev => (prev ? prev + "\nAI: " : "") + result.solutionApplied);
            setFormData(prev => ({
                ...prev,
                preventiveActions: result.preventiveActions
            }));
            // Ideally AI would select checkboxes, but mapping text to IDs is complex without an LLM call for that specifically.
            // We just populate the text for now.
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Combine selections and details into final string
        const causes = [
            ...COMMON_CAUSES.filter(c => selectedCauses.includes(c.id)).map(c => c.label),
            causeDetails
        ].filter(Boolean).join(", ");

        const solutions = [
            ...COMMON_SOLUTIONS.filter(s => selectedSolutions.includes(s.id)).map(s => s.label),
            solutionDetails
        ].filter(Boolean).join(", ");

        if (!confirm("Confermi la registrazione dell'EWO?")) return;

        setLoading(true);
        try {
            const res = await submitEWO({
                workOrderId: params.id,
                ...formData,
                causeAnalysis: causes,
                solutionApplied: solutions,
                totalDowntimeMin: calculateDowntime(),
                partsConsumed // Pass parts to backend
            });

            if (res.success) {
                alert(res.message);
                router.push(`/work-orders/${params.id}`);
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
                        <p className="text-muted-foreground">Analisi Guasto, Costi e Impatto #{params.id}</p>
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
                <p className="text-lg">Riferimento Ordine: #{params.id}</p>
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
                            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between border">
                                <span className="font-medium text-slate-600">Totale Fermo Macchina:</span>
                                <span className="text-2xl font-bold font-mono">
                                    {calculateDowntime()} min
                                </span>
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

                {/* 3. CAUSE & SOLUZIONI (Grids) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-600">
                            <Microscope className="h-5 w-5" />
                            Cause Identificate
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {COMMON_CAUSES.map(cause => (
                                <button
                                    key={cause.id}
                                    type="button"
                                    disabled={isViewMode}
                                    onClick={() => toggleSelection(selectedCauses, setSelectedCauses, cause.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-all hover:bg-muted/50",
                                        selectedCauses.includes(cause.id) ? "bg-amber-50 border-amber-500 text-amber-900" : "bg-background"
                                    )}
                                >
                                    <span className="text-lg">{cause.icon}</span>
                                    <span className="text-xs font-medium text-center">{cause.label}</span>
                                </button>
                            ))}
                        </div>
                        <input
                            disabled={isViewMode}
                            placeholder="Dettagli cause..."
                            className="w-full p-2 text-sm border rounded"
                            value={causeDetails}
                            onChange={e => setCauseDetails(e.target.value)}
                        />
                    </div>

                    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2 text-emerald-600">
                            <Wrench className="h-5 w-5" />
                            Intervento Eseguito
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {COMMON_SOLUTIONS.map(sol => (
                                <button
                                    key={sol.id}
                                    type="button"
                                    disabled={isViewMode}
                                    onClick={() => toggleSelection(selectedSolutions, setSelectedSolutions, sol.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-all hover:bg-muted/50",
                                        selectedSolutions.includes(sol.id) ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-background"
                                    )}
                                >
                                    <span className="text-lg">{sol.icon}</span>
                                    <span className="text-xs font-medium text-center">{sol.label}</span>
                                </button>
                            ))}
                        </div>
                        <input
                            disabled={isViewMode}
                            placeholder="Dettagli intervento..."
                            className="w-full p-2 text-sm border rounded"
                            value={solutionDetails}
                            onChange={e => setSolutionDetails(e.target.value)}
                        />
                    </div>
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
