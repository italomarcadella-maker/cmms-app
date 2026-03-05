"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaySquare, Save, RefreshCw, AlertTriangle, TrendingDown } from "lucide-react";

export function GanttSandboxControls({
    onSimulate,
    originalEndDate,
    projectedEndDate,
    roiImpact
}: {
    onSimulate: () => void;
    originalEndDate: string;
    projectedEndDate?: string;
    roiImpact?: number;
}) {
    const [isSandboxActive, setIsSandboxActive] = useState(false);

    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${isSandboxActive ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' : 'bg-card border-border'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                {/* Toggle Sandbox Mode */}
                <div className="flex items-center gap-4">
                    {isSandboxActive ? (
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 border-amber-400 animate-pulse cursor-pointer" onClick={() => setIsSandboxActive(false)}>
                                Modalità Sandbox Attiva
                            </Badge>
                            <div className="h-6 w-px bg-border mx-2"></div>
                            <Button size="sm" variant="ghost" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 dark:text-amber-400 dark:hover:bg-amber-900/50" onClick={onSimulate}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Ricalcola Impatto
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsSandboxActive(true)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                            <PlaySquare className="mr-2 h-4 w-4" />
                            Attiva What-If Sandbox
                        </Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {isSandboxActive
                            ? "Trascina le task nel Gantt per simulare i ritardi senza salvare le modifiche."
                            : "Simula modifiche alle date per vedere l'impatto sul ROI."}
                    </span>
                </div>

                {/* Results Panel */}
                {isSandboxActive && projectedEndDate && (
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4">
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Data Fine (Prevista vs Simulata)</div>
                            <div className="flex items-center gap-2 justify-end font-mono text-sm">
                                <span className="line-through opacity-70">{originalEndDate}</span>
                                <span>&rarr;</span>
                                <span className={projectedEndDate > originalEndDate ? "text-red-500 font-bold" : "text-green-500 font-bold"}>
                                    {projectedEndDate}
                                </span>
                            </div>
                        </div>

                        {roiImpact !== undefined && roiImpact !== 0 && (
                            <div className="bg-white dark:bg-black rounded-lg p-2 border shadow-sm flex items-center gap-2">
                                <div className={`p-1.5 rounded-full ${roiImpact < 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'}`}>
                                    <TrendingDown className={`h-4 w-4 ${roiImpact > 0 ? "rotate-180" : ""}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground leading-tight">Impatto ROI</span>
                                    <span className={`text-sm font-bold leading-tight ${roiImpact < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                                        {roiImpact < 0 ? "" : "+"}{roiImpact.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="h-8 w-px bg-amber-200 dark:bg-amber-800 mx-1"></div>

                        <div className="flex flex-col gap-1">
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-7 shadow-sm">
                                <Save className="mr-2 h-3 w-3" /> Applica Modifiche
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setIsSandboxActive(false)}>Annulla Sim</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Warning Alert if delays reduce ROI */}
            {isSandboxActive && (roiImpact || 0) < 0 && (
                <div className="mt-4 p-3 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300 text-sm rounded-lg flex items-center gap-2 border border-red-100 dark:border-red-900 animate-in zoom-in-95">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Attenzione: Rallentare il percorso critico "Setup Inverter" ritarda il Go-Live e riduce il ROI previsto del trimestre in corso.
                </div>
            )}
        </div>
    );
}
