"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle, FileText, CheckCircle2, Wand2, Printer } from "lucide-react";
import { getEWO, submitEWO } from "@/lib/actions";
import { generateEWOAnalysis } from "@/lib/ai-service";

export default function EWOFormPage({ params }: { params: { id: string } }) {
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isViewMode, setIsViewMode] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        description: "",
        causeAnalysis: "",
        solutionApplied: "",
        preventiveActions: "",
        needsFollowUp: false,
        followUpDetail: ""
    });

    useEffect(() => {
        // Load existing EWO if any
        getEWO(params.id).then(data => {
            if (data) {
                setFormData({
                    description: data.description || "",
                    causeAnalysis: data.causeAnalysis || "",
                    solutionApplied: data.solutionApplied || "",
                    preventiveActions: data.preventiveActions || "",
                    needsFollowUp: data.needsFollowUp || false,
                    followUpDetail: data.followUpDetail || ""
                });
                setIsViewMode(true);
            }
            setInitialLoading(false);
        });
    }, [params.id]);

    const handleAIAnalysis = async () => {
        if (!formData.description) {
            alert("Inserisci una descrizione del guasto per avviare l'analisi AI.");
            return;
        }
        setAiLoading(true);
        try {
            const result = await generateEWOAnalysis(formData.description);
            setFormData(prev => ({
                ...prev,
                causeAnalysis: result.causeAnalysis,
                solutionApplied: result.solutionApplied,
                preventiveActions: result.preventiveActions
            }));
        } catch (e) {
            console.error(e);
            alert("Errore AI.");
        } finally {
            setAiLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("Confermi la registrazione dell'EWO? Questo sbloccherà la chiusura dell'ordine.")) return;

        setLoading(true);
        try {
            const res = await submitEWO({
                workOrderId: params.id,
                ...formData
            });

            if (res.success) {
                alert("EWO registrato con successo.");
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
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in py-6 print:py-0 print:max-w-none print:bg-white print:text-black">
            <style jsx global>{`
                @media print {
                    header, aside, .bottom-nav, .no-print { display: none !important; }
                    body { background: white; color: black; }
                    .print-visible { display: block !important; }
                    input, textarea { border: none !important; resize: none; overflow: visible; font-family: monospace; background: white !important; color: black !important; }
                    button { display: none !important; }
                }
            `}</style>

            <div className="flex items-center justify-between mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                            Emergency Work Order (EWO)
                        </h1>
                        <p className="text-muted-foreground">Analisi dell'intervento e azioni correttive per ordine #{params.id}</p>
                    </div>
                </div>
                {isViewMode && (
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium">
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

            <form onSubmit={handleSubmit} className="space-y-6 print:space-y-4">
                {/* Section 1: Analysis */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
                    <div className="flex items-center justify-between border-b pb-2 mb-4 print:border-b-2 print:border-black">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500 print:hidden" />
                            Analisi dell'Accaduto
                        </h3>
                        {!isViewMode && (
                            <button
                                type="button"
                                onClick={handleAIAnalysis}
                                disabled={aiLoading || !formData.description}
                                className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 flex items-center gap-1.5 font-medium transition-colors"
                            >
                                {aiLoading ? <span className="animate-spin">✨</span> : <Wand2 className="h-3 w-3" />}
                                {aiLoading ? "Analizzando..." : "Autocompleta con AI"}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descrizione Dettagliata dell'Emergenza</label>
                        <textarea
                            required
                            disabled={isViewMode}
                            className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
                            placeholder="Cosa è successo? Descrivi il guasto e l'impatto."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Analisi delle Cause (5 Whys)</label>
                        <textarea
                            required
                            disabled={isViewMode}
                            className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
                            placeholder="Perché è successo? Identifica la causa radice."
                            value={formData.causeAnalysis}
                            onChange={e => setFormData({ ...formData, causeAnalysis: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Soluzione Applicata</label>
                        <textarea
                            required
                            disabled={isViewMode}
                            className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm"
                            placeholder="Quale intervento tecnico è stato eseguito?"
                            value={formData.solutionApplied}
                            onChange={e => setFormData({ ...formData, solutionApplied: e.target.value })}
                        />
                    </div>
                </div>

                {/* Section 2: Future & Follow-up */}
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2 print:border-b-2 print:border-black">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 print:hidden" />
                        Prevenzione e Follow-up
                    </h3>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Azioni Preventive Proposte</label>
                        <textarea
                            disabled={isViewMode}
                            className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm"
                            placeholder="Cosa fare per evitare che ricapiti?"
                            value={formData.preventiveActions}
                            onChange={e => setFormData({ ...formData, preventiveActions: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg print:bg-transparent print:p-0">
                        <input
                            type="checkbox"
                            id="followUp"
                            disabled={isViewMode}
                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={formData.needsFollowUp}
                            onChange={e => setFormData({ ...formData, needsFollowUp: e.target.checked })}
                        />
                        <label htmlFor="followUp" className="font-medium cursor-pointer">
                            Necessita di interventi successivi (Follow-up)
                        </label>
                    </div>

                    {formData.needsFollowUp && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium text-amber-600">Dettagli Nuova Richiesta</label>
                            <textarea
                                required={formData.needsFollowUp}
                                disabled={isViewMode}
                                className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm border-amber-200 focus:border-amber-400"
                                placeholder="Descrivi il lavoro aggiuntivo necessario..."
                                value={formData.followUpDetail}
                                onChange={e => setFormData({ ...formData, followUpDetail: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {!isViewMode && (
                    <div className="flex justify-end gap-4 print:hidden">
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
                            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center gap-2 shadow-sm"
                        >
                            {loading ? "Salvataggio..." : <><Save className="h-4 w-4" /> Registra EWO</>}
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
                            Modifica EWO
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
