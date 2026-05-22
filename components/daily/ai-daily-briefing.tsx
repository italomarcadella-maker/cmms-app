"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, AlertTriangle, ShieldCheck, Activity, Wrench, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AiDailyBriefing({ meetingId }: { meetingId: string }) {
    const [briefing, setBriefing] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);

        fetch(`/api/daily-meetings/${meetingId}/ai-briefing`)
            .then(res => res.json())
            .then(data => {
                if (active) {
                    if (data && data.areas) {
                        setBriefing(data);
                    } else {
                        setBriefing({
                            areas: {
                                SAFETY: { insight: "Dati non disponibili.", alertLevel: "LOW" },
                                QUALITY: { insight: "Dati non disponibili.", alertLevel: "LOW" },
                                PRODUCTION: { insight: "Dati non disponibili.", alertLevel: "LOW" },
                                MAINTENANCE: { insight: "Dati non disponibili.", alertLevel: "LOW" }
                            }
                        });
                    }
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Briefing Fetch Error:", err);
                if (active) {
                    setBriefing({
                        areas: {
                            SAFETY: { insight: "Impossibile recuperare il briefing in questo momento.", alertLevel: "LOW" },
                            QUALITY: { insight: "Impossibile recuperare il briefing in questo momento.", alertLevel: "LOW" },
                            PRODUCTION: { insight: "Impossibile recuperare il briefing in questo momento.", alertLevel: "LOW" },
                            MAINTENANCE: { insight: "Impossibile recuperare il briefing in questo momento.", alertLevel: "LOW" }
                        }
                    });
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [meetingId]);

    if (loading) {
        return (
            <Card className="border-indigo-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-indigo-50 bg-indigo-50/50">
                    <CardTitle className="text-sm flex items-center text-indigo-700"><BrainCircuit className="h-4 w-4 mr-2 animate-pulse" /> Generazione AI Briefing...</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    const renderIcon = (key: string) => {
        switch (key) {
            case 'SAFETY': return <ShieldCheck className="h-4 w-4" />;
            case 'QUALITY': return <AlertTriangle className="h-4 w-4" />;
            case 'PRODUCTION': return <Activity className="h-4 w-4" />;
            case 'MAINTENANCE': return <Wrench className="h-4 w-4" />;
            default: return null;
        }
    };

    const getAlertColor = (level: string) => {
        switch (level) {
            case 'HIGH': return 'border-red-200 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300';
            case 'MEDIUM': return 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300';
            case 'LOW': return 'border-green-200 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300';
            default: return 'bg-muted';
        }
    };

    return (
        <Card className="border-indigo-200 dark:border-indigo-900 shadow-md bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/30 dark:to-background overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-indigo-800 dark:text-indigo-400">
                    <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    AI Prep Briefing
                </CardTitle>
                <CardDescription className="text-xs">
                    L'IA ha analizzato i meeting dei 7 giorni precedenti. Usa questi spunti per guidare la discussione.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                {Object.entries<any>(briefing.areas).map(([key, data]) => (
                    <div key={key} className={`p-3 rounded-lg border ${getAlertColor(data.alertLevel)}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 opacity-80">
                                {renderIcon(key)} {key}
                            </span>
                            <Badge variant="outline" className="text-[9px] uppercase h-4 px-1">{data.alertLevel}</Badge>
                        </div>
                        <p className="text-sm">{data.insight}</p>
                        {data.suggestedAction && (
                            <div className="mt-2 text-xs bg-white/50 dark:bg-black/20 p-2 rounded flex gap-1.5 items-start">
                                <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="font-medium italic">{data.suggestedAction}</span>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
