"use client";

import { useEffect, useState } from 'react';
import { getDailyInsights, DailyInsight } from '@/lib/ai-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Info, AlertCircle, Sparkles } from 'lucide-react'; // Changed RefreshCw to Sparkles
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function AIDailyBrief() {
    const [insights, setInsights] = useState<DailyInsight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDailyInsights().then(data => {
            setInsights(data);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
                <div className="h-12 w-full bg-muted/50 rounded animate-pulse" />
                <div className="h-12 w-full bg-muted/50 rounded animate-pulse" />
            </div>
        </div>
    );

    if (insights.length === 0) return null;

    return (
        <Card className="border-none shadow-sm bg-gradient-to-br from-violet-50 via-white to-white dark:from-violet-950/20 dark:to-background border-l-4 border-l-violet-500 overflow-hidden relative">
            {/* Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="h-24 w-24 text-violet-500" />
            </div>

            <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg flex items-center gap-2 text-violet-700 dark:text-violet-400">
                    <Sparkles className="h-5 w-5" />
                    AI Daily Briefing
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 relative z-10">
                {insights.map(insight => (
                    <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-card/60 backdrop-blur-sm border hover:bg-white dark:hover:bg-card transition-all shadow-sm">
                        <div className="mt-0.5 shrink-0">
                            {insight.type === 'ALERT' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                            {insight.type === 'WARNING' && <AlertCircle className="h-5 w-5 text-amber-500" />}
                            {insight.type === 'SUCCESS' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                            {insight.type === 'INFO' && <Info className="h-5 w-5 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                            <h4 className={cn("font-semibold text-sm",
                                insight.type === 'ALERT' && "text-red-700 dark:text-red-400",
                                insight.type === 'WARNING' && "text-amber-700 dark:text-amber-400",
                                insight.type === 'SUCCESS' && "text-emerald-700 dark:text-emerald-400",
                                insight.type === 'INFO' && "text-blue-700 dark:text-blue-400"
                            )}>{insight.title}</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{insight.message}</p>
                            {insight.actionLabel && (
                                <Link href={insight.actionUrl || '#'} className="text-xs font-medium text-primary hover:underline mt-2 inline-flex items-center gap-1">
                                    {insight.actionLabel} →
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
