"use client";

import { useAssets } from "@/lib/assets-context";
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
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { cn } from "@/lib/utils";

export default function PredictivePage() {
    const { assets } = useAssets();

    // Mock predictive data logic
    // In a real app, this would come from an AI/ML backend analysis
    const predictiveAssets = assets.map(asset => {
        // Mock probability based on status and random factor
        const baseRisk = asset.status === 'MAINTENANCE' ? 75 :
            asset.status === 'OFFLINE' ? 0 :
                15;
        const randomRisk = Math.floor(Math.random() * 25);
        const failureProbability = Math.min(99, baseRisk + randomRisk);

        const daysToFailure = Math.floor(Math.random() * 30) + 2;

        return {
            ...asset,
            failureProbability,
            daysToFailure,
            healthScore: 100 - failureProbability,
            predictionConfidence: Math.floor(Math.random() * 20) + 80 // 80-99%
        };
    }).sort((a, b) => b.failureProbability - a.failureProbability);

    const highRiskAssets = predictiveAssets.filter(a => a.failureProbability > 40);
    const healthyAssets = predictiveAssets.filter(a => a.failureProbability <= 40);

    // Mock trend data for the main chart
    const trendData = Array.from({ length: 14 }, (_, i) => ({
        day: `Giorno ${i + 1}`,
        health: 95 - (Math.random() * 10) - (i * 0.5), // Slightly degrading trend
        predicted: i > 10 // Last 3 points are predicted
    }));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
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
                            L'analisi dei pattern vibrazionali ha rilevato un'anomalia sulla <strong>Linea Estrusione A</strong>.
                            Il modello prevede una possibile usura critica dei cuscinetti entro <strong>14 giorni</strong> con una confidenza del 92%.
                            Si consiglia di programmare un intervento preventivo.
                        </p>
                        <div className="pt-2">
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-md transition-all hover:scale-105">
                                Pianifica Analisi Tecnica <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
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
                        <div className="text-2xl font-bold">87/100</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-emerald-500 font-medium">+2.5%</span> rispetto alla media storica
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Asset a Rischio</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{highRiskAssets.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Probabilità guasto &gt; 40%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Risparmio Stimato</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€ 12.450</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Grazie ad interventi preventivi questo mese
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tempo Medio Guarigione</CardTitle>
                        <Timer className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.2 Giorni</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            -15% rispetto alla manutenzione reattiva
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
                                            <Button variant="ghost" size="sm" className="hidden sm:flex">
                                                Dettagli
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Chart */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Trend Salute Globale</CardTitle>
                            <CardDescription>Andamento ultimi 14 giorni</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="day" hide />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="health" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorHealth)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between text-sm border-b pb-2">
                                    <span className="text-muted-foreground">Oggi</span>
                                    <span className="font-bold">Valore Reale</span>
                                </div>
                                <div className="flex items-center justify-between text-sm border-b pb-2">
                                    <span className="text-muted-foreground">Domani (Previsto)</span>
                                    <span className="font-bold text-purple-600">96% Confidenza</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50/50 border-blue-100">
                        <CardContent className="p-6">
                            <h4 className="font-semibold text-blue-900 mb-2">Lo sapevi?</h4>
                            <p className="text-sm text-blue-800/80">
                                La manutenzione predittiva può ridurre i costi di manutenzione del 30% e i tempi di fermo del 45% rispetto a quella reattiva.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
