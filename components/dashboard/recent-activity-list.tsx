"use client";

import { Activity, ClipboardList, Wrench, AlertTriangle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WOStatusBadge } from "@/components/dashboard/wo-status-badge";

export function RecentActivityList({ recentWOs }: { recentWOs: any[] }) {
    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-muted/20">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Attività Recenti
                    </h3>
                </div>
                <Link href="/work-orders" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                    Visualizza Tutti <ArrowUpRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="divide-y max-h-[400px] overflow-y-auto">
                {recentWOs.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                        <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                            <ClipboardList className="h-6 w-6 opacity-50" />
                        </div>
                        <p>Nessuna attività registrata di recente.</p>
                    </div>
                ) : (
                    recentWOs.map((wo) => (
                        <div key={wo.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-2.5 rounded-xl transition-colors",
                                    wo.type === 'FAULT' ? "bg-red-50 text-red-600 dark:bg-red-900/20" :
                                        wo.type === 'ROUTINE' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" :
                                            "bg-purple-50 text-purple-600 dark:bg-purple-900/20"
                                )}>
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <div>
                                    <Link href={`/work-orders/${wo.id}`} className="font-semibold text-sm hover:text-primary transition-colors block mb-0.5">
                                        {wo.title}
                                    </Link>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span className="font-mono bg-muted/50 px-1 rounded">{wo.id.substring(0, 8)}...</span>
                                        <span>•</span>
                                        <span>{wo.asset?.name || 'Asset Generico'}</span>
                                        <span>•</span>
                                        <span>{new Date(wo.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <WOStatusBadge status={wo.status} />
                                {wo.priority === 'HIGH' && (
                                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> URGENTE
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
