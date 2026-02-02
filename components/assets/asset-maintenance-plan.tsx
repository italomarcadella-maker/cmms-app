"use client";

import { useState, useEffect } from "react";
import { Calendar, Wand2, Plus, Trash2, Check, ExternalLink, AlertCircle } from "lucide-react";
import { getAssetSchedules, createPreventiveSchedule, deletePreventiveSchedule } from "@/lib/actions";
import { generatePreventiveSuggestions } from "@/lib/ai-service";
import { useRouter } from "next/navigation";

// Define interfaces locally if not exported
interface Schedule {
    id: string;
    taskTitle: string;
    description: string;
    frequency: string;
    // activities: string; // JSON string or array, simplified
    nextDueDate: string | Date; // Can come as string from API
    assetName?: string;
}

interface Suggestion {
    title: string;
    description: string;
    frequency: string;
    frequencyDays: number;
    confidence: string;
}

export function AssetMaintenancePlan({ assetId }: { assetId: string }) {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const router = useRouter();

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const data = await getAssetSchedules(assetId);
            setSchedules(data as any); // Cast to handle varying date types
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, [assetId]);

    const handleGenerateSuggestions = async () => {
        setAiLoading(true);
        setSuggestions([]);
        try {
            const data = await generatePreventiveSuggestions(assetId);
            setSuggestions(data);
            if (!data || data.length === 0) {
                alert("Nessun suggerimento disponibile. Lo storico interventi potrebbe essere insufficiente.");
            }
        } catch (error) {
            console.error(error);
            alert("Errore generazione suggerimenti");
        } finally {
            setAiLoading(false);
        }
    };

    const handleApplySuggestion = async (s: Suggestion) => {
        if (!confirm(`Vuoi creare il piano "${s.title}" con frequenza ${s.frequency}?`)) return;

        try {
            await createPreventiveSchedule({
                title: s.title,
                description: s.description,
                assetId,
                frequency: s.frequency,
                frequencyDays: s.frequencyDays,
                activities: [], // Empty generic checklist for now
                firstDate: new Date()
            });
            alert("Piano creato con successo!");
            setSuggestions(prev => prev.filter(x => x.title !== s.title)); // Remove applied
            fetchSchedules(); // Refresh list
        } catch (error) {
            alert("Errore creazione piano");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Eliminare questa schedulazione?")) return;
        await deletePreventiveSchedule(id);
        fetchSchedules();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Piano di Manutenzione
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleGenerateSuggestions}
                        disabled={aiLoading}
                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50"
                    >
                        {aiLoading ? <span className="animate-spin">✨</span> : <Wand2 className="h-3 w-3" />}
                        {aiLoading ? "Analizzando..." : "AI Advisor"}
                    </button>
                    {/* Manual create button could go here */}
                </div>
            </div>

            {/* Suggestions Area */}
            {suggestions.length > 0 && (
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 mb-4">
                    <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                        <Wand2 className="h-4 w-4" /> Suggerimenti AI Basati su Storico
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        {suggestions.map((s, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border shadow-sm flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-medium text-purple-900">{s.title}</div>
                                    <div className="text-xs text-muted-foreground mt-1 mb-2">{s.description}</div>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                                            {s.frequency}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${s.confidence === 'Alta' ? 'bg-emerald-100 text-emerald-600' :
                                                s.confidence === 'Media' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            Confidenza: {s.confidence}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApplySuggestion(s)}
                                    className="shrink-0 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 shadow-sm transition-colors"
                                    title="Applica Piano"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Existing Schedules */}
            {loading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Caricamento piani...</div>
            ) : schedules.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/10">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground italic text-sm">Nessuna manutenzione programmata.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {schedules.map(sched => (
                        <div key={sched.id} className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                            <div>
                                <div className="font-medium">{sched.taskTitle}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Frequenza: <span className="font-semibold">{sched.frequency}</span> •
                                    Prossima: {new Date(sched.nextDueDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDelete(sched.id)}
                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                    title="Elimina"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
