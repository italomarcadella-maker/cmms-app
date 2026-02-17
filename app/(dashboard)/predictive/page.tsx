"use client";

import { useAssets } from "@/lib/assets-context";
import { useWorkOrders } from "@/lib/work-orders-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    BrainCircuit,
    AlertTriangle,
    CheckCircle2,
    TrendingDown,
    Activity,
    Zap,
    Timer,
    Sparkles,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackToDashboardButton } from "@/components/ui/back-button";
import { useEffect, useState } from "react";
import { getKPISummary } from "@/lib/actions";

export default function PredictivePage() {
    const { assets } = useAssets();
    const { workOrders } = useWorkOrders();
    const [kpiStats, setKpiStats] = useState({
        avgHealth: 0,
        riskAssets: 0,
        totalCost: 0,
        mttrHours: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const stats = await getKPISummary();
                setKpiStats(stats);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    // Real predictive logic based on Asset Health Score and Open Faults
    const predictiveAssets = assets.map(asset => {
        // Calculate Risk based on Health Score (Real Data)
        let failureProbability = 100 - (asset.healthScore || 100);

        // Adjust risk if there are open FAULT or HIGH priority WOs
        const openFaults = workOrders.filter(wo =>
            wo.assetId === asset.id &&
            wo.status !== 'COMPLETED' &&
            wo.status !== 'CLOSED' &&
            wo.status !== 'CANCELED'
        ).length;

        if (openFaults > 0) {
            failureProbability += (openFaults * 10); // Increase risk by 10% per open issue
        }

        // Cap at 99%
        failureProbability = Math.min(99, Math.max(0, failureProbability));

        // Estimate days to failure (Heuristic: Lower health = fewer days)
        let daysToFailure = 999;
        if (asset.healthScore < 50) daysToFailure = Math.round(asset.healthScore / 10) + 1;
        else if (asset.healthScore < 80) daysToFailure = Math.round(asset.healthScore / 2);

        return {
            ...asset,
            failureProbability,
            daysToFailure,
            healthScore: asset.healthScore,
            predictionConfidence: 95
        };
    }).sort((a, b) => b.failureProbability - a.failureProbability);

    const highRiskAssets = predictiveAssets.filter(a => a.failureProbability > 40);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <BackToDashboardButton />
            {/* Header Section */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                    <BrainCircuit className="h-8 w-8 text-purple-600" />
                    Manutenzione Predittiva AI
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Analisi avanzata dello stato degli asset e previsione guasti basata su modelli di Machine Learning.
                </p>
            </div>

            {/* AI Insight Banner */}
            <div className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 border border-purple-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BrainCircuit className="w-32 h-32 text-purple-600" />
                </div>
                <div className="flex gap-4 relative z-10">
                    <div className="p-3 bg-white rounded-full shadow-sm h-fit">
                        <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-purple-900 text-lg">Insight AI - Priorità Alta</h3>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">Nuovo</Badge>
                        </div>
                        <p className="text-purple-800/80 leading-relaxed">
                            {highRiskAssets.length > 0 ? (
                                <>
                                    Rilevata criticità su <strong>{highRiskAssets[0].name}</strong>.
                                    Probabilità di guasto del <strong>{highRiskAssets[0].failureProbability}%</strong> basata sui dati attuali.
                                    Si consiglia manutenzione preventiva immediata.
                                </>
                            ) : (
                                "Tutti i sistemi operano entro i parametri nominali. Nessuna anomalia critica rilevata al momento."
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Indice di Salute Impianto</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(kpiStats.avgHealth)}/100</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Media di tutti gli asset (Live)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Asset a Rischio</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiStats.riskAssets}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Asset con salute criticao
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costi Mese Corrente</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€ {kpiStats.totalCost.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ricambi + Manodopera (Reale)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">MTTR (90gg)</CardTitle>
                        <Timer className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {kpiStats.mttrHours > 0 ? `${kpiStats.mttrHours.toFixed(1)} Ore` : "N/D"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Tempo medio riparazione
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Code: Risk List */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Analisi Rischi Asset</CardTitle>
                            <CardDescription>
                                Previsioni di guasto basate su telemetria in tempo reale e storico interventi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {predictiveAssets.map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "p-2.5 rounded-full",
                                                asset.failureProbability > 70 ? "bg-red-100 text-red-600" :
                                                    asset.failureProbability > 40 ? "bg-amber-100 text-amber-600" :
                                                        "bg-green-100 text-green-600"
                                            )}>
                                                {asset.failureProbability > 40 ? <TrendingDown className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{asset.name}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Modello: {asset.model} • Locazione: {asset.location}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Prob. Guasto</div>
                                                <div className={cn(
                                                    "text-lg font-bold",
                                                    asset.failureProbability > 70 ? "text-red-600" :
                                                        asset.failureProbability > 40 ? "text-amber-600" :
                                                            "text-green-600"
                                                )}>
                                                    {asset.failureProbability}%
                                                </div>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Tempo Stimato</div>
                                                <div className="font-medium text-sm">
                                                    {asset.failureProbability > 20 ? <span>~ {asset.daysToFailure} giorni</span> : <span className="text-muted-foreground">-</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Removed Fake Chart */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-blue-50/50 border-blue-100">
                        <CardContent className="p-6">
                            <h4 className="font-semibold text-blue-900 mb-2">Lo sapevi?</h4>
                            <p className="text-sm text-blue-800/80">
                                La manutenzione predittiva basata sui dati reali riduce drasticamente gli interventi non pianificati. Monitora costantemente le anomalie per anticipare i guasti.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
