"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';

import { getDailyInsights } from '@/lib/ai-service';
import { DailyInsight } from '@/lib/ai/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AIDailyBriefProps {
    initialInsights?: DailyInsight[];
}

const insightStyle = {
    ALERT: { icon: AlertTriangle, iconClass: 'text-critical-strong', titleClass: 'text-critical-strong' },
    WARNING: { icon: AlertCircle, iconClass: 'text-warning-strong', titleClass: 'text-warning-strong' },
    SUCCESS: { icon: CheckCircle, iconClass: 'text-success-strong', titleClass: 'text-success-strong' },
    INFO: { icon: Info, iconClass: 'text-info-strong', titleClass: 'text-info-strong' },
} as const;

export function AIDailyBrief({ initialInsights = [] }: AIDailyBriefProps) {
    const [insights, setInsights] = useState<DailyInsight[]>(initialInsights);
    const [loading, setLoading] = useState(initialInsights.length === 0);

    useEffect(() => {
        if (initialInsights.length > 0) return;

        getDailyInsights().then(data => {
            setInsights(data);
            setLoading(false);
        });
    }, [initialInsights]);

    if (loading) return (
        <div className="space-y-3 rounded-xl border bg-card p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
        </div>
    );

    if (insights.length === 0) return null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-info-soft text-info-strong">
                        <Sparkles className="h-4 w-4" />
                    </span>
                    Briefing giornaliero
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                {insights.map(insight => {
                    const style = insightStyle[insight.type as keyof typeof insightStyle] ?? insightStyle.INFO;
                    const Icon = style.icon;
                    return (
                        <div key={insight.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.iconClass)} />
                            <div className="flex-1">
                                <h4 className={cn('text-sm font-semibold', style.titleClass)}>{insight.title}</h4>
                                <p className="text-sm leading-relaxed text-muted-foreground">{insight.message}</p>
                                {insight.actionLabel && (
                                    <Link href={insight.actionUrl || '#'} className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline">
                                        {insight.actionLabel}
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
