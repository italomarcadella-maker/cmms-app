"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf, TrendingDown, Target, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function EsgSustainabilityDashboard({
    ecologicalRoi,
    energySavings
}: {
    ecologicalRoi?: number;
    energySavings?: number;
}) {
    return (
        <Card className="col-span-full md:col-span-1 border-emerald-100 dark:border-emerald-900 shadow-md bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-background">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-500">
                        <Leaf className="h-5 w-5" />
                        Impatto ESG & Sostenibilità
                    </CardTitle>
                </div>
                <CardDescription>
                    Risultati ecologici stimati per i progetti di Ingegneria di Processo attivi.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">

                    {/* CO2 Emissions */}
                    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-black/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                        <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                            <span>Riduzione CO2 Annuo</span>
                            <TrendingDown className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                {ecologicalRoi || 14.5}
                            </span>
                            <span className="text-sm pb-1 text-muted-foreground">ton.</span>
                        </div>
                        <Progress value={65} className="h-1.5 mt-1 [&>div]:bg-emerald-500" />
                        <span className="text-xs text-right text-muted-foreground">65% del Target 2026</span>
                    </div>

                    {/* Energy Savings */}
                    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-black/20 rounded-lg border border-amber-100 dark:border-amber-900/50">
                        <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                            <span>Risparmio Energetico</span>
                            <Zap className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                                {energySavings || 450}
                            </span>
                            <span className="text-sm pb-1 text-muted-foreground">kWh/Giorno</span>
                        </div>
                        <Progress value={45} className="h-1.5 mt-1 [&>div]:bg-amber-500" />
                        <span className="text-xs text-right text-muted-foreground">45% del Target 2026</span>
                    </div>

                </div>

                <div className="mt-4 pt-4 border-t border-emerald-100/50 dark:border-emerald-900/50 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Target className="h-4 w-4" />
                        Allineamento ISO 50001
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Conforme</span>
                </div>
            </CardContent>
        </Card>
    );
}
