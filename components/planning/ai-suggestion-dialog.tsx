"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { suggestActivitiesForDowntime } from "@/lib/ai-service"; // Ensure this is exported
import { Loader2, Sparkles, Check, AlertTriangle } from "lucide-react";
import { differenceInHours } from "date-fns";

interface AISuggestionDialogProps {
    slot: { line: string, startTime: string | Date, endTime: string | Date, type: string };
    onClose: () => void;
}

export function AISuggestionDialog({ slot, onClose }: AISuggestionDialogProps) {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<{ message: string, suggestions: any[] } | null>(null);

    useEffect(() => {
        const analyze = async () => {
            const duration = differenceInHours(new Date(slot.endTime), new Date(slot.startTime));
            // Simulate reading context
            const data = await suggestActivitiesForDowntime(slot.line, duration || 1);
            setResult(data);
            setLoading(false);
        };
        analyze();
    }, [slot]);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Analisi AI Copilot
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <p>Analizzo lo stato della linea "{slot.line}"...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm border border-indigo-100">
                                {result?.message}
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {result?.suggestions.map((s, idx) => (
                                    <div key={idx} className="border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors flex gap-3">
                                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${s.type === 'PM' ? 'bg-amber-500' : s.type === 'WO' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                        <div className="space-y-1">
                                            <div className="font-medium text-sm flex items-center justify-between w-full">
                                                {s.title}
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground border px-1 rounded">{s.type}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{s.reason}</p>
                                            <div className="text-[10px] text-muted-foreground/70 bg-muted inline-block px-1.5 py-0.5 rounded">
                                                {s.assetName}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>Chiudi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
