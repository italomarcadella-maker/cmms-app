"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReference } from "@/lib/reference-context";
import { useWorkOrders } from "@/lib/work-orders-context";
import { User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WOAssignDialogProps {
    workOrderId: string | null;
    currentTechnicianId?: string;
    onClose: () => void;
}

export function WOAssignDialog({ workOrderId, currentTechnicianId, onClose }: WOAssignDialogProps) {
    const { technicians } = useReference();
    const { updateWorkOrder, workOrders } = useWorkOrders();
    const wo = workOrders.find(w => w.id === workOrderId);
    const [selectedTechId, setSelectedTechId] = useState<string | undefined>(currentTechnicianId);
    const [recommendedId, setRecommendedId] = useState<string | null>(null);

    useEffect(() => {
        setSelectedTechId(currentTechnicianId);
    }, [currentTechnicianId]);

    useEffect(() => {
        if (!wo) return;

        let bestTechId: string | null = null;
        let maxScore = -1;

        technicians.forEach(t => {
            // Score based on:
            // 1. Past experience on this specific asset (3 points per job)
            // 2. Specialty match (5 points)

            const assetJobs = workOrders.filter(w =>
                w.assignedTechnicianId === t.id &&
                w.assetId === wo.assetId &&
                w.status === 'CLOSED'
            ).length;

            let score = assetJobs * 3;
            if (wo.category && t.specialty && wo.category.toLowerCase().includes(t.specialty.toLowerCase())) {
                score += 5;
            }

            if (score > maxScore && score > 0) {
                maxScore = score;
                bestTechId = t.id;
            }
        });

        setRecommendedId(bestTechId);
    }, [wo, technicians, workOrders]);

    const handleSave = () => {
        if (!workOrderId) return;
        // Logic same as before
        if (!selectedTechId) {
            updateWorkOrder(workOrderId, { assignedTechnicianId: undefined, assignedTo: "Unassigned" });
        } else {
            const tech = technicians.find(t => t.id === selectedTechId);
            if (tech) {
                updateWorkOrder(workOrderId, { assignedTechnicianId: tech.id, assignedTo: tech.name });
            }
        }
        onClose();
    };

    return (
        <Dialog open={!!workOrderId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assegna Tecnico</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Seleziona un tecnico dall'elenco:</h4>
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                            <div
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted",
                                    !selectedTechId ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                                )}
                                onClick={() => setSelectedTechId(undefined)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="font-medium">Nessuno (Non assegnato)</span>
                                </div>
                                {!selectedTechId && <Check className="h-4 w-4 text-primary" />}
                            </div>

                            {technicians.map((tech) => {
                                const isRecommended = tech.id === recommendedId;
                                return (
                                    <div
                                        key={tech.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted relative",
                                            selectedTechId === tech.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card",
                                            isRecommended && "border-emerald-300 bg-emerald-50/50"
                                        )}
                                        onClick={() => setSelectedTechId(tech.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-primary font-bold text-xs",
                                                isRecommended ? "bg-emerald-100 text-emerald-700" : "bg-primary/10")}>
                                                {tech.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm">{tech.name}</p>
                                                    {isRecommended && (
                                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            ⚡ Best Match
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{tech.specialty}</p>
                                            </div>
                                        </div>
                                        {selectedTechId === tech.id && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annulla</Button>
                    <Button onClick={handleSave}>Conferma Assegnazione</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
