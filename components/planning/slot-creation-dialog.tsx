"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductionSlot } from "@/lib/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SlotCreationDialogProps {
    line: string;
    date: Date;
    onClose: () => void;
    onSuccess: () => void;
}

export function SlotCreationDialog({ line, date, onClose, onSuccess }: SlotCreationDialogProps) {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState("PRODUCTION");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        // Default 8 hours shift
        const start = new Date(date);
        start.setHours(8, 0, 0, 0); // 08:00

        const end = new Date(date);
        end.setHours(16, 0, 0, 0); // 16:00

        // Allow overriding hours if we had inputs for time, keeping simple for now

        const result = await createProductionSlot({
            line,
            startTime: start,
            endTime: end,
            type,
            notes: formData.get("notes") as string
        });

        if (result.success) {
            toast.success("Slot creato");
            onSuccess();
            onClose();
        } else {
            toast.error(result.message || "Errore");
        }
        setLoading(false);
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuovo Slot - {line}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Tipo Attività</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PRODUCTION">Produzione (Rosso)</SelectItem>
                                <SelectItem value="MAINTENANCE_WINDOW">Finestra Manutenzione (Verde)</SelectItem>
                                <SelectItem value="IDLE">Fermo / Inattivo (Grigio)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Note</Label>
                        <Input name="notes" placeholder="Dettagli..." />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Crea
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
