"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReference } from "@/lib/reference-context";
import { useWorkOrders } from "@/lib/work-orders-context";
import { User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateWorkOrderAssignments } from "@/lib/actions"; // Direct import
import { toast } from "sonner";

interface WOAssignDialogProps {
    workOrderId: string | null;
    currentTechnicianId?: string; // Legacy support
    onClose: () => void;
}

import { useRouter } from "next/navigation";

export function WOAssignDialog({ workOrderId, currentTechnicianId, onClose }: WOAssignDialogProps) {
    const router = useRouter();
    const { technicians } = useReference();
    const { workOrders } = useWorkOrders(); // Read-only access to list
    const wo = workOrders.find(w => w.id === workOrderId);

    // Multi-select state
    const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
    const [recommendedId, setRecommendedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Initialize selection from WO data if available, else usage of legacy prop
        if (wo && wo.technicians && wo.technicians.length > 0) {
            setSelectedTechIds(wo.technicians.map(t => t.id));
        } else if (currentTechnicianId) {
            setSelectedTechIds([currentTechnicianId]);
        } else {
            setSelectedTechIds([]);
        }
    }, [workOrderId, currentTechnicianId, wo]);

    useEffect(() => {
        if (!wo) return;

        let bestTechId: string | null = null;
        let maxScore = -1;

        technicians.forEach(t => {
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

    const toggleSelection = (id: string | undefined) => {
        if (!id) {
            // "None" option clears all
            setSelectedTechIds([]);
            return;
        }

        setSelectedTechIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSave = async () => {
        if (!workOrderId) return;
        setIsSaving(true);

        try {
            // Call server action directly
            const res = await updateWorkOrderAssignments(workOrderId, selectedTechIds);
            if (res.success) {
                toast.success("Assegnazioni aggiornate");
                // We might need to refresh context? The action calls revalidatePath.
                // Ideally context should re-fetch or optimistically update.
                // For now relying on Next.js Server Components Refresh via router (implicit in revalidatePath?)
                // Client context might be stale until refresh.
                // Client context might be stale until refresh.
                router.refresh(); // Syncs server components without full reload
            } else {
                toast.error("Errore: " + res.message);
            }
        } catch (e) {
            toast.error("Errore disistema");
        } finally {
            setIsSaving(false);
            onClose();
        }
    };

    return (
        <Dialog open={!!workOrderId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assegna Tecnici</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Seleziona uno o più tecnici:</h4>
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                            <div
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted",
                                    selectedTechIds.length === 0 ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                                )}
                                onClick={() => toggleSelection(undefined)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="font-medium">Nessuno (Non assegnato)</span>
                                </div>
                                {selectedTechIds.length === 0 && <Check className="h-4 w-4 text-primary" />}
                            </div>

                            {technicians.map((tech) => {
                                const isRecommended = tech.id === recommendedId;
                                const isSelected = selectedTechIds.includes(tech.id);
                                return (
                                    <div
                                        key={tech.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted relative",
                                            isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card",
                                            isRecommended && !isSelected && "border-emerald-300 bg-emerald-50/50"
                                        )}
                                        onClick={() => toggleSelection(tech.id)}
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
                                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Annulla</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Salvataggio..." : "Conferma"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
