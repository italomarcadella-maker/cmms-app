"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, GitCommit, GitMerge, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VersionItem {
    versionId: string;
    versionNumber: number;
    author: string;
    date: string;
    isCurrent: boolean;
    changes: string[];
    kaizenRef?: string;
    performanceImpact?: "positive" | "negative" | "neutral";
}

export function SopVersionHistory({ currentSopName }: { currentSopName: string }) {
    const [history] = useState<VersionItem[]>([
        {
            versionId: "v3-99a",
            versionNumber: 3,
            author: "Ing. Rossi (Approvato)",
            date: "Oggi, 11:30",
            isCurrent: true,
            changes: ["Modificata procedura Step 3", "Ridotto tempo ciclo di 5 sec."],
            kaizenRef: "#KZ-104",
            performanceImpact: "positive",
        },
        {
            versionId: "v2-88b",
            versionNumber: 2,
            author: "Sistema AI (Auto-Generato)",
            date: "Ieri, 14:00",
            isCurrent: false,
            changes: ["Adeguamento pressione post-anomalia"],
            performanceImpact: "negative",
        },
        {
            versionId: "v1-11c",
            versionNumber: 1,
            author: "M. Bianchi",
            date: "25 Feb 2026",
            isCurrent: false,
            changes: ["Creazione iniziale manuale"],
            performanceImpact: "neutral",
        }
    ]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    Versionamento SOP
                </h3>
                <Badge variant="outline" className="font-mono bg-muted/50">
                    {currentSopName}
                </Badge>
            </div>

            <ScrollArea className="h-[400px] pr-4">
                <div className="relative border-l border-muted ml-3 space-y-6 pb-4 pt-2">
                    {history.map((item, index) => (
                        <div key={item.versionId} className="relative pl-6">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-2 top-1 h-4 w-4 rounded-full border-2 
                ${item.isCurrent ? 'bg-primary border-primary ring-4 ring-primary/20' : 'bg-background border-muted-foreground'}
              `} />

                            <div className={`p-4 rounded-lg border ${item.isCurrent ? 'border-primary/50 shadow-sm bg-primary/5' : 'bg-card'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">v{item.versionNumber}.0</span>
                                        <Badge variant={item.isCurrent ? "default" : "secondary"} className="text-[10px] h-5">
                                            {item.isCurrent ? "Corrente" : "Archiviata"}
                                        </Badge>
                                        {item.kaizenRef && (
                                            <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
                                                Da Kaizen {item.kaizenRef}
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">{item.versionId}</span>
                                </div>

                                <div className="text-sm text-muted-foreground mb-3 flex items-center justify-between">
                                    <span>Modificata da: <strong>{item.author}</strong></span>
                                    <span>{item.date}</span>
                                </div>

                                <div className="space-y-1 mb-4">
                                    {item.changes.map((change, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            <GitCommit className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <span>{change}</span>
                                        </div>
                                    ))}
                                </div>

                                {!item.isCurrent && (
                                    <div className="flex items-center justify-between border-t pt-3 mt-2">
                                        {item.performanceImpact === "negative" && (
                                            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                                <AlertTriangle className="h-3 w-3" /> Resa peggiorata rispetto v1
                                            </span>
                                        )}
                                        {item.performanceImpact === "neutral" && <span></span>}
                                        {item.performanceImpact === "positive" && <span></span>}

                                        <Button variant="outline" size="sm" className="h-7 text-xs ml-auto">
                                            <GitMerge className="mr-1 h-3 w-3" /> Rollback a v{item.versionNumber}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
