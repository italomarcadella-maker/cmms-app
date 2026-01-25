"use client";

import { Sparkles, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface RecommendationProps {
    assetId: string;
    assetName: string;
}

export function MaintenanceRecommendationCard({ assetId, assetName }: RecommendationProps) {
    // In a real app, this would fetch from the AI service based on the specific asset
    // For now, we mock a random scenario
    const hasIssue = Math.random() > 0.3; // 70% chance of an issue for demo purposes

    if (!hasIssue) {
        return (
            <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/10 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">All Systems Nominal</h3>
                        <p className="text-sm text-green-800/80 dark:text-green-200/70 mt-1">
                            AI analysis indicates optimal performance. No immediate actions required.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Mock Issue scenario
    const issue = "Vibration anomaly detected in main bearing";
    const action = "Inspect Bearing & Lubrication";

    return (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-900/50 p-6">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-600 dark:text-amber-400 animate-pulse">
                    <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">AI Insight</span>
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full text-amber-700 dark:text-amber-300">Confidence: 94%</span>
                    </div>
                    <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-100 leading-tight">
                        {issue}
                    </h3>
                    <p className="text-sm text-amber-800/80 dark:text-amber-200/70 mt-2">
                        Predictive model A-7 detected irregular frequency patterns suggesting early stage wear.
                    </p>

                    <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                        <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Suggested Action: <span className="underline">{action}</span>
                        </div>
                        <Link
                            href={`/work-orders/new?assetId=${assetId}&title=${encodeURIComponent(action)}&description=${encodeURIComponent("AI Automated Request: " + issue)}&priority=HIGH`}
                            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Auto-Schedule Fix <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
