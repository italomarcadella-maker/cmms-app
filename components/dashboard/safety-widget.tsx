"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert, ArrowRight, CheckCircle2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { assignWorkOrder } from "@/lib/actions";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
        // "Green State" - No issues
        return (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-500">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">Sicurezza OK</h3>
                    <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80">Nessuna segnalazione critica attiva al momento.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden animate-in slide-in-from-top-4 duration-500 shadow-lg shadow-red-500/10">
                <div className="p-4 border-b border-red-500/20 bg-red-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-red-500 text-white p-1.5 rounded-lg animate-pulse">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-700 dark:text-red-400 leading-none">Sicurezza Prioritaria</h3>
                            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{requests.length} Segnalazioni Richiedono Attenzione</p>
                        </div>
                    </div>
                    <Button asChild size="sm" variant="destructive" className="h-8 text-xs shadow-md">
                        <Link href="/requests/safety">
                            Gestisci <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </div>

                <div className="divide-y divide-red-500/10">
                    {requests.map((req) => (
                        <div key={req.id} className="p-3 hover:bg-red-500/5 transition-colors flex items-center justify-between gap-3 group">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-0.5">
                                    {req.priority === 'HIGH' || req.priority === 'STOPPED' ? (
                                        <AlertTriangle className="h-4 w-4 text-red-600 animate-bounce cursor-help" />
                                    ) : (
                                        <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="text-sm font-semibold truncate group-hover:text-red-600 transition-colors">
                                            {req.title}
                                        </h4>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded font-medium border uppercase tracking-wider",
                                            req.priority === 'HIGH' || req.priority === 'STOPPED'
                                                ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900"
                                                : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900"
                                        )}>
                                            {req.priority === 'STOPPED' ? 'CRITICA' : req.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                        {req.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                                        <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{req.asset?.name || 'Sistema'}</span>
                                        {req.assignedTo && (
                                            <>
                                                <span>•</span>
                                                <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                                                    Assegnato: {req.assignedTo}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!req.assignedTechnicianId && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/10 dark:hover:bg-red-900/20 dark:border-red-900 flex-shrink-0"
                                    onClick={() => {
                                        setAssigningId(req.id);
                                        setIsDialogOpen(true);
                                    }}
                                >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Assegna
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assegnazione Rapida</DialogTitle>
                        <DialogDescription>
                            Seleziona un tecnico per prendere in carico questa segnalazione di sicurezza.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <label className="text-sm font-medium mb-1.5 block">Tecnico Disponibile</label>
                        <Select value={selectedTech} onValueChange={setSelectedTech}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona tecnico..." />
                            </SelectTrigger>
                            <SelectContent>
                                {technicians.map((tech) => (
                                    <SelectItem key={tech.id} value={tech.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={tech.image} />
                                                <AvatarFallback className="text-[10px]">
                                                    {tech.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {tech.name}
                                            <span className="text-xs text-muted-foreground ml-1">({tech.specialty})</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" onClick={() => {
                                setIsDialogOpen(false);
                                setAssigningId(null);
                                setSelectedTech("");
                            }}>Annulla</Button>
                        </DialogClose>
                        <Button
                            onClick={handleAssign}
                            disabled={!selectedTech || isLoading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isLoading ? "Assegnazione..." : "Conferma Assegnazione"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
