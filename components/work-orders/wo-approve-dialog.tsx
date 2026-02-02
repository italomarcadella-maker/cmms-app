"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useReference } from "@/lib/reference-context";
import { approveRequest } from "@/lib/actions";
import { User, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useWorkOrders } from "@/lib/work-orders-context";

interface WOApproveDialogProps {
    workOrderId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function WOApproveDialog({ workOrderId, isOpen, onClose }: WOApproveDialogProps) {
    const { technicians } = useReference();
    const { refreshWorkOrders } = useWorkOrders();
    const [selectedTechId, setSelectedTechId] = useState<string | undefined>(undefined);
    const [priority, setPriority] = useState("MEDIUM");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleApprove = async () => {
        if (!selectedTechId) {
            toast.error("Devi assegnare un tecnico per approvare la richiesta.");
            return;
        }

        setLoading(true);
        try {
            const result = await approveRequest(workOrderId, selectedTechId, priority);
            if (result.success) {
                toast.success(result.message);
                await refreshWorkOrders();
                onClose();
                router.refresh(); // Refresh page data
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Errore durante l'approvazione");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Approva Richiesta</DialogTitle>
                    <DialogDescription>
                        Assegna un tecnico e una priorità per convertire questa richiesta in ordine di lavoro.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Priority Config */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Priorità</label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona Priorità" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LOW">Bassa</SelectItem>
                                <SelectItem value="MEDIUM">Media</SelectItem>
                                <SelectItem value="HIGH">Alta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Technician Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Assegna Tecnico</label>
                        <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2 border rounded-md p-2 bg-muted/20">
                            {technicians.map((tech) => (
                                <div
                                    key={tech.id}
                                    className={cn(
                                        "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-all hover:bg-muted",
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
                    <Button variant="outline" onClick={onClose} disabled={loading}>Annulla</Button>
                    <Button onClick={handleApprove} disabled={loading || !selectedTechId}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approva e Assegna
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
