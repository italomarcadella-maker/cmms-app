"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, Zap, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GoldenBatchCardProps {
    sopTitle: string;
    insights: { metric: string; optimizedValue: string; impact: string }[];
}

export function GoldenBatchInsights({ sopTitle, insights }: GoldenBatchCardProps) {
    return (
        <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-200 dark:border-indigo-800 shadow-md">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <Sparkles className="h-5 w-5" />
                        &quot;Golden Batch&quot; AI Analysis
                    </CardTitle>
                    <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-300">
                        AI Ottimizzazione
                    </Badge>
                </div>
                <CardDescription>
                    Analisi delle performance storiche per la SOP: <strong>{sopTitle}</strong>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    L&apos;IA ha identificato pattern nei cicli produttivi più efficienti passati.
                    Applicare queste variazioni potrebbe migliorare la resa.
                </p>
                <div className="space-y-3">
                    {insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-indigo-100 dark:border-indigo-800/50">
                            <div>
                                <p className="text-sm font-medium">{insight.metric}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs font-mono">
                                        Ideale: {insight.optimizedValue}
                                    </Badge>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AlertCircle className="h-4 w-4 text-amber-500 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Valore raccomandato per minimizzare gli scarti.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                            <div className="flex flex-col items-end text-emerald-600 dark:text-emerald-400">
                                <div className="flex items-center gap-1 text-sm font-semibold">
                                    {insight.impact.includes("Energia") ? <Zap className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                                    <span>{insight.impact}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
