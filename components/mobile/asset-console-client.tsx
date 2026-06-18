"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
    Play, 
    Pause, 
    AlertTriangle, 
    CheckCircle2, 
    Wrench, 
    FileText, 
    ArrowLeft, 
    Activity, 
    ShieldAlert, 
    Plus, 
    Cpu, 
    Loader2 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { updateAssetStatus, createQuickWorkOrder } from "@/lib/process-actions";

interface ActiveWO {
    id: string;
    title: string;
    priority: string;
    status: string;
    createdAt: Date;
}

interface AssetDetails {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    location: string;
    status: string;
    healthScore: number;
}

interface ConsoleClientProps {
    asset: AssetDetails;
    activeWorkOrders: ActiveWO[];
}

export function AssetConsoleClient({ asset, activeWorkOrders }: ConsoleClientProps) {
    const router = useRouter();
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
    const [isSubmittingWO, setIsSubmittingWO] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Form states for Quick Work Order
    const [woTitle, setWoTitle] = useState("");
    const [woDesc, setWoDesc] = useState("");
    const [woPriority, setWoPriority] = useState<"STOPPED" | "MALFUNCTIONING" | "HIGH" | "MEDIUM" | "LOW">("MALFUNCTIONING");
    const [woCategory, setWoCategory] = useState<"MECHANICAL" | "ELECTRICAL" | "HYDRAULIC" | "PNEUMATIC" | "SOFTWARE" | "CIVIL" | "OTHER" | "SAFETY" | "IMPROVEMENT">("MECHANICAL");

    // Audio beep synthesis for success sound
    const playSuccessSound = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // Play two pleasant rising notes
            osc.type = "sine";
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) {
            console.log("Audio not supported or blocked.");
        }
    };

    // Handle Asset Status Update
    const handleStatusChange = async (newStatus: "OPERATIONAL" | "MAINTENANCE" | "OFFLINE") => {
        setIsUpdatingStatus(newStatus);
        const res = await updateAssetStatus(asset.id, newStatus);
        setIsUpdatingStatus(null);

        if (res.success) {
            playSuccessSound();
            toast.success(`Stato asset aggiornato a ${newStatus === "OPERATIONAL" ? "OPERATIVO" : newStatus === "MAINTENANCE" ? "MANUTENZIONE" : "OFFLINE"}`);
            router.refresh();
        } else {
            toast.error(res.message || "Errore aggiornamento stato");
        }
    };

    // Handle Quick WO Submit
    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!woTitle.trim()) {
            toast.error("Inserisci un titolo per la segnalazione");
            return;
        }

        setIsSubmittingWO(true);
        const res = await createQuickWorkOrder({
            assetId: asset.id,
            title: woTitle,
            description: woDesc || "Nessun dettaglio aggiuntivo fornito via cellulare.",
            priority: woPriority,
            category: woCategory
        });
        setIsSubmittingWO(false);

        if (res.success) {
            playSuccessSound();
            toast.success("Ticket di emergenza inviato con successo!");
            setShowReportModal(false);
            setWoTitle("");
            setWoDesc("");
            router.refresh();
        } else {
            toast.error(res.message || "Errore creazione segnalazione");
        }
    };

    const statusObj = 
        asset.status === "OPERATIONAL"
            ? { label: "OPERATIVO", color: "emerald", gradient: "from-emerald-500 to-teal-600", text: "text-emerald-500", border: "border-emerald-500/20", icon: CheckCircle2 }
            : asset.status === "MAINTENANCE"
            ? { label: "IN MANUTENZIONE", color: "blue", gradient: "from-blue-500 to-indigo-600", text: "text-blue-500", border: "border-blue-500/20", icon: Wrench }
            : { label: "FERMO IMPIANTO", color: "red", gradient: "from-red-600 to-rose-700", text: "text-red-500", border: "border-red-500/20", icon: ShieldAlert };

    const StatusIcon = statusObj.icon;

    return (
        <div className="space-y-6 pb-24">
            {/* Minimal Back Nav */}
            <div className="flex items-center gap-2 select-none">
                <Link 
                    href="/mobile/scan" 
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border px-3 py-1.5 rounded-full hover:bg-zinc-100 transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Torna a Scanner</span>
                </Link>
            </div>

            {/* Glowing Big Status Card */}
            <div className={cn(
                "relative bg-gradient-to-r text-white p-6 rounded-3xl shadow-xl overflow-hidden",
                statusObj.gradient
            )}>
                {/* Visual Glow rings */}
                <span className="absolute -top-16 -right-16 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <span className="absolute -bottom-20 -left-20 w-44 h-44 bg-black/10 rounded-full blur-2xl" />

                <div className="relative flex justify-between items-start">
                    <div>
                        <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 font-mono">
                            Console Tecnica Mobile
                        </span>
                        <h1 className="text-2xl font-black tracking-tight mt-1">{asset.name}</h1>
                        <p className="text-xs opacity-90 font-mono mt-1">SN: {asset.serialNumber}</p>
                    </div>

                    <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md">
                        <StatusIcon className={cn("h-7 w-7 text-white", asset.status === "OFFLINE" && "animate-pulse")} />
                    </div>
                </div>

                <div className="relative mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider opacity-85">Stato Corrente</p>
                        <p className="text-lg font-black tracking-wide mt-0.5">{statusObj.label}</p>
                    </div>
                    <div className="bg-black/25 px-3 py-1 rounded-full text-center border border-white/10">
                        <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">Health Score</span>
                        <span className="text-sm font-extrabold">{asset.healthScore}%</span>
                    </div>
                </div>
            </div>

            {/* Zero-Friction Big Status Selector Grid */}
            <div>
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 px-1">
                    Cambio Stato Rapido (Zero Friction)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {/* Operativo */}
                    <button
                        onClick={() => handleStatusChange("OPERATIONAL")}
                        disabled={isUpdatingStatus !== null}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 active:scale-95",
                            asset.status === "OPERATIONAL"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_4px_15px_rgba(16,185,129,0.15)] font-bold"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                        )}
                    >
                        {isUpdatingStatus === "OPERATIONAL" ? (
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                        ) : (
                            <Play className={cn("h-6 w-6 mb-1.5", asset.status === "OPERATIONAL" ? "text-emerald-500" : "text-zinc-400")} />
                        )}
                        <span className="text-xs">Operativo</span>
                    </button>

                    {/* Manutenzione */}
                    <button
                        onClick={() => handleStatusChange("MAINTENANCE")}
                        disabled={isUpdatingStatus !== null}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 active:scale-95",
                            asset.status === "MAINTENANCE"
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-[0_4px_15px_rgba(59,130,246,0.15)] font-bold"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                        )}
                    >
                        {isUpdatingStatus === "MAINTENANCE" ? (
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        ) : (
                            <Wrench className={cn("h-6 w-6 mb-1.5", asset.status === "MAINTENANCE" ? "text-blue-500" : "text-zinc-400")} />
                        )}
                        <span className="text-xs">Manutenzione</span>
                    </button>

                    {/* Fermo Impianto */}
                    <button
                        onClick={() => handleStatusChange("OFFLINE")}
                        disabled={isUpdatingStatus !== null}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 active:scale-95",
                            asset.status === "OFFLINE"
                                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 shadow-[0_4px_15px_rgba(239,68,68,0.15)] font-bold"
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                        )}
                    >
                        {isUpdatingStatus === "OFFLINE" ? (
                            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                        ) : (
                            <Pause className={cn("h-6 w-6 mb-1.5", asset.status === "OFFLINE" ? "text-red-500 animate-pulse" : "text-zinc-400")} />
                        )}
                        <span className="text-xs">Fermo Impianto</span>
                    </button>
                </div>
            </div>

            {/* Active Work Orders on Asset */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-3xl shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center justify-between">
                    <span>Ordini Attivi sull'Impianto</span>
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-mono text-zinc-500 dark:text-zinc-400 font-bold">
                        {activeWorkOrders.length}
                    </span>
                </h3>

                {activeWorkOrders.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400 text-xs border border-dashed rounded-2xl">
                        Nessun ordine aperto per questo macchinario.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeWorkOrders.map((wo) => {
                            const isStopped = wo.priority === "STOPPED" || wo.priority === "HIGH";

                            return (
                                <Link 
                                    href={`/work-orders/${wo.id}`}
                                    key={wo.id}
                                    className="block p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20 active:bg-zinc-100/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <span className={cn(
                                            "text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                            isStopped 
                                                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-pulse" 
                                                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                        )}>
                                            {wo.priority}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                            {new Date(wo.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 line-clamp-1">
                                        {wo.title}
                                    </h4>
                                    <div className="flex items-center gap-1 text-[9px] text-zinc-500 mt-1 font-semibold uppercase tracking-wider">
                                        <Activity className="h-3 w-3 text-violet-500" />
                                        <span>Stato: {wo.status}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Giant Sticky Bottom "Segnala Guasto" Button */}
            <div className="fixed bottom-20 left-0 right-0 px-4 py-2 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-zinc-950 dark:via-zinc-950/95 z-30 select-none">
                <button
                    onClick={() => setShowReportModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-xl shadow-red-500/20 active:scale-98 transition-all duration-300"
                >
                    <Plus className="h-5 w-5" />
                    <span>Segnala Guasto Rapido (1-Click)</span>
                </button>
            </div>

            {/* Giant slide-over drawer modal for creating a Work Order */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center select-none animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-t-[32px] p-6 space-y-4 shadow-2xl border-t border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-150 dark:border-zinc-800/80">
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                                    <Cpu className="h-5 w-5 text-red-500" />
                                    Nuova Segnalazione
                                </h3>
                                <p className="text-xs text-zinc-500">Asset: <strong>{asset.name}</strong></p>
                            </div>
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-sm font-semibold p-2"
                            >
                                Annulla
                            </button>
                        </div>

                        <form onSubmit={handleReportSubmit} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                                    Titolo Breve Guasto
                                </label>
                                <input
                                    type="text"
                                    placeholder="Es. Sostituzione cuscinetto rumoroso"
                                    value={woTitle}
                                    onChange={(e) => setWoTitle(e.target.value)}
                                    required
                                    className="w-full p-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                />
                            </div>

                            {/* Priority Selection */}
                            <div>
                                <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                                    Gravità / Priorità
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { val: "STOPPED", label: "Fermo Linea", class: "border-red-500 text-red-600 bg-red-500/5" },
                                        { val: "MALFUNCTIONING", label: "Rallentamento", class: "border-amber-500 text-amber-600 bg-amber-500/5" },
                                        { val: "LOW", label: "Minore", class: "border-zinc-400 text-zinc-600 bg-zinc-400/5" }
                                    ].map((p) => (
                                        <button
                                            key={p.val}
                                            type="button"
                                            onClick={() => setWoPriority(p.val as any)}
                                            className={cn(
                                                "border py-2 px-1 text-center rounded-xl text-xs font-bold transition-all",
                                                woPriority === p.val
                                                    ? p.class
                                                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50"
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                                    Ambito Intervento
                                </label>
                                <select
                                    value={woCategory}
                                    onChange={(e) => setWoCategory(e.target.value as any)}
                                    className="w-full p-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                >
                                    <option value="MECHANICAL">⚙️ Meccanica</option>
                                    <option value="ELECTRICAL">⚡ Elettrica</option>
                                    <option value="HYDRAULIC">💧 Idraulica</option>
                                    <option value="PNEUMATIC">💨 Pneumatica</option>
                                    <option value="SOFTWARE">💻 Automazione / PLC</option>
                                    <option value="SAFETY">🛡️ Sicurezza</option>
                                    <option value="OTHER">📦 Altro</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                                    Dettaglio Note (Opzionale)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Fornisci ulteriori informazioni sul blocco..."
                                    value={woDesc}
                                    onChange={(e) => setWoDesc(e.target.value)}
                                    className="w-full p-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmittingWO}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold py-3.5 rounded-xl shadow-md disabled:opacity-50"
                            >
                                {isSubmittingWO ? (
                                    <>
                                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                        <span>Invio in corso...</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-4.5 w-4.5" />
                                        <span>Invia Segnalazione a Sistema</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
