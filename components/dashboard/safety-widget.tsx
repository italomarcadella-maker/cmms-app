"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, ShieldAlert, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { PriorityPill } from "@/components/ui/status-badge";
import { assignWorkOrder } from "@/lib/actions";

interface SafetyWidgetProps {
    requests: any[];
    technicians: any[];
}

export function SafetyWidget({ requests, technicians }: SafetyWidgetProps) {
    const [selectedTech, setSelectedTech] = useState<string>("");
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAssign = async () => {
        if (!assigningId || !selectedTech) return;

        setIsLoading(true);
        try {
            await assignWorkOrder(assigningId, selectedTech);
            toast.success("Assegnazione completata");
            setIsDialogOpen(false);
            setAssigningId(null);
            setSelectedTech("");
        } catch (error) {
            console.error(error);
            toast.error("Errore durante l'assegnazione");
        } finally {
            setIsLoading(false);
        }
    };

    if (requests.length === 0) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success-soft/50 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-strong">
                    <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-success-strong">Sicurezza in regola</h3>
                    <p className="text-sm text-muted-foreground">Nessuna segnalazione di sicurezza attiva al momento.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <section aria-label="Segnalazioni di sicurezza" className="overflow-hidden rounded-xl border border-critical/40 bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-critical/20 bg-critical-soft px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-critical text-critical-foreground">
                            <ShieldAlert className="h-5 w-5" />
                        </span>
                        <div>
                            <h3 className="text-sm font-semibold leading-tight text-critical-strong">Sicurezza prioritaria</h3>
                            <p className="text-xs text-critical-strong/80">
                                {requests.length === 1 ? "1 segnalazione richiede attenzione" : `${requests.length} segnalazioni richiedono attenzione`}
                            </p>
                        </div>
                    </div>
                    <Button asChild size="sm" variant="destructive">
                        <Link href="/requests/safety">
                            Gestisci <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>

                <ul className="divide-y">
                    {requests.map((req) => (
                        <li key={req.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="truncate text-sm font-semibold">{req.title}</h4>
                                    <PriorityPill priority={req.priority} />
                                </div>
                                <p className="line-clamp-1 text-sm text-muted-foreground">{req.description}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(req.createdAt).toLocaleDateString("it-IT")} · {req.asset?.name || "Sistema"}
                                    {req.assignedTo && <span className="font-medium text-success-strong"> · Assegnato a {req.assignedTo}</span>}
                                </p>
                            </div>

                            {!req.assignedTechnicianId && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0"
                                    onClick={() => {
                                        setAssigningId(req.id);
                                        setIsDialogOpen(true);
                                    }}
                                >
                                    <UserPlus className="mr-1.5 h-4 w-4" />
                                    Assegna
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assegnazione rapida</DialogTitle>
                        <DialogDescription>Scegli il tecnico che prende in carico questa segnalazione di sicurezza.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <Label>Tecnico</Label>
                        <Select value={selectedTech} onValueChange={setSelectedTech}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona un tecnico" />
                            </SelectTrigger>
                            <SelectContent>
                                {technicians.map((tech) => (
                                    <SelectItem key={tech.id} value={tech.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={tech.image} />
                                                <AvatarFallback className="text-[10px]">{tech.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {tech.name}
                                            <span className="ml-1 text-xs text-muted-foreground">({tech.specialty})</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setAssigningId(null);
                                    setSelectedTech("");
                                }}
                            >
                                Annulla
                            </Button>
                        </DialogClose>
                        <Button onClick={handleAssign} disabled={!selectedTech || isLoading}>
                            {isLoading ? "Assegnazione in corso" : "Conferma assegnazione"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
