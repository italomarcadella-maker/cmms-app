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
    const { updateWorkOrder } = useWorkOrders();
    const [selectedTechId, setSelectedTechId] = useState<string | undefined>(currentTechnicianId);

    useEffect(() => {
        setSelectedTechId(currentTechnicianId);
    }, [currentTechnicianId]);

    const handleSave = () => {
        if (!workOrderId) return;

        if (!selectedTechId) {
            // Unassign
            updateWorkOrder(workOrderId, {
                assignedTechnicianId: undefined,
                assignedTo: "Unassigned"
            });
        } else {
            const tech = technicians.find(t => t.id === selectedTechId);
            if (tech) {
                updateWorkOrder(workOrderId, {
                    assignedTechnicianId: tech.id,
                    assignedTo: tech.name
                });
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
                            {/* Option to Unassign */}
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

                            {technicians.map((tech) => (
                                <div
                                    key={tech.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted",
                                        selectedTechId === tech.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                                    )}
                                    onClick={() => setSelectedTechId(tech.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <span className="text-xs font-bold">{tech.name.substring(0, 2).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{tech.name}</p>
                                            <p className="text-xs text-muted-foreground">{tech.specialty}</p>
                                        </div>
                                    </div>
                                    {selectedTechId === tech.id && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            ))}
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
