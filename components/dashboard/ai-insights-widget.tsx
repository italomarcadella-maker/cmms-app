"use client";

import { useEffect, useState } from 'react';
import { AIInsight, MockAIService } from '@/lib/ai-service';
import { Sparkles, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AAInsightsWidget() {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        MockAIService.getInsights().then((data) => {
            setInsights(data);
            setLoading(false);
        });
    }, []);

    return (
        <div className="col-span-full lg:col-span-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500 fill-purple-500/20" />
                    <h3 className="text-lg font-semibold">AI Maintenance Advisor</h3>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    Beta
                </span>
            </div>

            <div className="p-6 space-y-4">
                {loading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
                        Analyzing system telemetry...
                    </div>
                ) : (
                    insights.map((insight) => (
                        <div key={insight.id} className="group flex items-start gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                            <div className={cn("mt-1 p-2 rounded-full bg-opacity-10 shrink-0",
                                insight.type === 'CRITICAL' ? "bg-red-500 text-red-600" :
                                    insight.type === 'WARNING' ? "bg-amber-500 text-amber-600" :
                                        "bg-blue-500 text-blue-600"
                            )}>
                                {insight.type === 'CRITICAL' ? <AlertTriangle className="h-4 w-4" /> :
                                    insight.type === 'WARNING' ? <Zap className="h-4 w-4" /> :
                                        <CheckCircle2 className="h-4 w-4" />}
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">{insight.assetName}</p>
                                    <span className={cn("text-xs font-bold",
                                        insight.confidence > 90 ? "text-green-600" : "text-muted-foreground"
                                    )}>
                                        {insight.confidence}% Confidence
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{insight.prediction}</p>
                                <div className="pt-2">
                                    <button className="text-xs font-medium text-primary hover:underline">
                                        Recommended: {insight.action} &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
