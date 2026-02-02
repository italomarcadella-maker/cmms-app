"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, StopCircle, Clock } from "lucide-react";
import { startWorkSession, pauseWorkSession, stopWorkSession, completeWorkOrder } from "@/lib/actions";
import { WorkOrder, WorkOrderTimer } from "@/lib/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TimerControlsProps {
    workOrder: WorkOrder;
    currentUserId: string;
}

export function TimerControls({ workOrder, currentUserId }: TimerControlsProps) {
    const router = useRouter();
    const [elapsed, setElapsed] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPauseDialog, setShowPauseDialog] = useState(false);
    const [pauseNote, setPauseNote] = useState("");

    // Find active timer for this user
    const activeTimer = workOrder.timers?.find(t => t.userId === currentUserId && !t.endTime);

    // Calculate total duration (historical + current)
    const historicalMinutes = workOrder.timers?.reduce((acc, t) => acc + (t.duration || 0), 0) || 0;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeTimer) {
            const startTime = new Date(activeTimer.startTime).getTime();

            // Update immediately
            setElapsed(Math.floor((Date.now() - startTime) / 1000));

            interval = setInterval(() => {
                const now = Date.now();
                const seconds = Math.floor((now - startTime) / 1000);
                setElapsed(seconds);
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [activeTimer]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = async () => {
        setIsLoading(true);
        const res = await startWorkSession(workOrder.id);
        if (!res.success) toast.error(res.message);
        else toast.success("Lavoro avviato");
        setIsLoading(false);
    };

    const handlePause = async () => {
        setIsLoading(true);
        const res = await pauseWorkSession(workOrder.id, pauseNote);
        if (!res.success) toast.error(res.message);
        else {
            toast.success("Lavoro in pausa");
            setShowPauseDialog(false);
            setPauseNote("");
        }
        setIsLoading(false);
    };

    const handleComplete = async () => {
        if (!confirm("Sei sicuro di voler completare l'ordine? Assicurati di aver compilato la checklist.")) return;
        setIsLoading(true);
        const res = await completeWorkOrder(workOrder.id);
        if (!res.success) toast.error(res.message);
        else toast.success("Ordine completato!");
        setIsLoading(false);
    };

    const isAssignedToMe = workOrder.assignedTechnicianId === currentUserId;

    if (!isAssignedToMe && workOrder.status !== 'COMPLETED' && workOrder.status !== 'CLOSED') {
        // Optional: Hide controls if not assigned to me, or show read-only
        return (
            <div className="flex items-center gap-2 text-muted-foreground text-sm border p-3 rounded-lg bg-muted/20">
                <Clock className="h-4 w-4" />
                <span>Tempo totale registrato: {historicalMinutes} min</span>
            </div>
        );
    }

    if (workOrder.status === 'COMPLETED' || workOrder.status === 'CLOSED') {
        return (
            <div className="flex items-center gap-2 text-green-600 text-sm border border-green-200 bg-green-50 p-3 rounded-lg">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Tempo totale finale: {historicalMinutes} min</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 border p-4 rounded-xl bg-card shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${activeTimer ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Tempo Sessione</p>
                        <p className="text-2xl font-mono font-bold">{formatTime(elapsed)}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Totale Accumulato</p>
                    <p className="font-mono font-semibold text-sm">{historicalMinutes} min</p>
                </div>
            </div>

            <div className="flex gap-2">
                {!activeTimer ? (
                    <Button
                        onClick={handleStart}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        Avvia Lavoro
                    </Button>
                ) : (
                    <Button
                        onClick={() => setShowPauseDialog(true)}
                        disabled={isLoading}
                        variant="secondary"
                        className="flex-1"
                    >
                        <Pause className="h-4 w-4 mr-2" />
                        Pausa
                    </Button>
                )}

                <Button
                    onClick={handleComplete}
                    disabled={isLoading || !!activeTimer} // Require stop before complete? Actually complete stops it.
                    // Let's allow complete while running, logic handles stop.
                    // But maybe safer to visually prompt stop.
                    // Action `completeWorkOrder` calls `stopWorkSession`, so it's handled.
                    variant="outline"
                    className="flex-1 border-blue-200 hover:bg-blue-50 text-blue-700"
                >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Completa Ordine
                </Button>
            </div>

            <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Metti in Pausa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Motivo (Opzionale)</Label>
                            <Textarea
                                placeholder="Es. Fine turno, Mancanza ricambi..."
                                value={pauseNote}
                                onChange={(e) => setPauseNote(e.target.value)}
                            />
                        </div>
                        <Button onClick={handlePause} className="w-full">
                            Conferma Pausa
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
