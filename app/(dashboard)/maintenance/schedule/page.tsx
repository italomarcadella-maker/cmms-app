"use client";

import { usePM } from "@/lib/pm-context";
import { useAssets } from "@/lib/assets-context";
import { format, differenceInDays } from "date-fns";
import { Calendar, CheckCircle2, AlertTriangle, Plus, Box, RefreshCw } from "lucide-react";

import { useState } from "react";

export default function PMSchedulePage() {
    const { schedules, generateDueWorkOrders } = usePM();
    const { assets } = useAssets();
    const [generatedCount, setGeneratedCount] = useState<number | null>(null);

    const handleGenerate = () => {
        const count = generateDueWorkOrders();
        setGeneratedCount(count);
        setTimeout(() => setGeneratedCount(null), 3000);
    };

    const getStatusColor = (dueDate: string) => {
        const days = differenceInDays(new Date(dueDate), new Date());
        if (days < 0) return { bg: "bg-red-100", text: "text-red-700", label: "Scaduto" };
        if (days <= 7) return { bg: "bg-amber-100", text: "text-amber-700", label: "In Scadenza" };
        return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Pianificato" };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Manutenzione Preventiva
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestisci le schedulazioni ricorrenti e genera ordini di lavoro.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                    <RefreshCw className="h-4 w-4" /> Genera Task Scaduti
                </button>
            </div>

            {generatedCount !== null && (
                <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Generati con successo {generatedCount} nuovi ordini di lavoro.</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedules.map(schedule => {
                    const status = getStatusColor(schedule.nextDueDate);
                    const asset = assets.find(a => a.id === schedule.assetId);

                    return (
                        <div key={schedule.id} className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg line-clamp-1">{schedule.taskTitle}</h3>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                        <Box className="h-3 w-3" />
                                        <span>{asset?.name || schedule.assetName}</span>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-semibold ${status.bg} ${status.text}`}>
                                    {status.label}
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                                {schedule.description}
                            </p>

                            <div className="space-y-2 pt-4 border-t text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Frequenza:</span>
                                    <span className="font-medium">Ogni {schedule.frequencyDays} giorni</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ultima Esecuzione:</span>
                                    <span>{new Date(schedule.lastRunDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Scadenza:
                                    </span>
                                    <span className={`font-mono font-medium ${status.text}`}>
                                        {new Date(schedule.nextDueDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {schedules.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>Nessuna schedulazione definita.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
