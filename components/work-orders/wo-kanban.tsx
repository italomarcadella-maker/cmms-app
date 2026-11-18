"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Calendar, User } from "lucide-react";
import { toast } from "sonner";

import { useWorkOrders } from "@/lib/work-orders-context";
import { useAuth } from "@/lib/auth-context";
import { WorkOrderStatus, WorkOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriorityPill, toneBarClass, type Tone } from "@/components/ui/status-badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { WOAssignDialog } from "./wo-assign-dialog";

// Every active status has a column, so no work order disappears from the board.
// Cancelled orders live in the "Storico" tab.
const COLUMNS: { id: WorkOrderStatus; label: string; tone: Tone }[] = [
    { id: "PENDING_APPROVAL", label: "Da approvare", tone: "warning" },
    { id: "APPROVED", label: "Approvato", tone: "info" },
    { id: "ASSIGNED", label: "Assegnato", tone: "info" },
    { id: "IN_PROGRESS", label: "In corso", tone: "progress" },
    { id: "ON_HOLD", label: "In attesa", tone: "neutral" },
    { id: "PENDING_REVIEW", label: "Da verificare", tone: "warning" },
    { id: "COMPLETED", label: "Eseguito", tone: "success" },
    { id: "CLOSED", label: "Validato", tone: "neutral" },
];

export function WorkOrderKanban({ workOrders }: { workOrders: WorkOrder[] }) {
    const router = useRouter();
    const { updateWorkOrderStatus } = useWorkOrders();
    const { user } = useAuth();
    const { confirm, dialog: confirmDialog } = useConfirm();

    const [assigningWo, setAssigningWo] = React.useState<{ id: string; techId?: string } | null>(null);
    const [dragOver, setDragOver] = React.useState<WorkOrderStatus | null>(null);

    const isAdminOrSupervisor = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
    const isMaintainer = user?.role === "MAINTAINER";

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("woId", id);
    };

    const handleDrop = (e: React.DragEvent, status: WorkOrderStatus) => {
        setDragOver(null);
        const id = e.dataTransfer.getData("woId");
        if (id) updateWorkOrderStatus(id, status);
    };

    const handleSelfAssign = async (woId: string) => {
        const ok = await confirm({
            title: "Prendere in carico questo ordine?",
            description: "L'ordine di lavoro verrà assegnato a te.",
            confirmLabel: "Prendi in carico",
        });
        if (!ok) return;

        const { assignWorkOrderToSelf } = await import("@/lib/actions");
        const res = await assignWorkOrderToSelf(woId);
        if (res.success) {
            toast.success("Ordine preso in carico");
            router.refresh();
        } else {
            toast.error("Impossibile prendere in carico l'ordine", { description: res.message });
        }
    };

    return (
        <>
            <div className="flex h-[calc(100vh-20rem)] min-h-[420px] gap-3 overflow-x-auto pb-2">
                {COLUMNS.map((col) => {
                    const items = workOrders.filter((wo) => wo.status === col.id);
                    return (
                        <section
                            key={col.id}
                            aria-label={col.label}
                            className={cn(
                                "flex h-full w-72 shrink-0 flex-col rounded-xl border bg-muted/50 transition-colors",
                                dragOver === col.id && "border-primary bg-accent"
                            )}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(col.id);
                            }}
                            onDragLeave={() => setDragOver((d) => (d === col.id ? null : d))}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="flex items-center justify-between border-b px-3 py-2.5">
                                <h3 className="flex items-center gap-2 text-sm font-semibold">
                                    <span aria-hidden className={cn("h-2 w-2 rounded-full", toneBarClass[col.tone])} />
                                    {col.label}
                                </h3>
                                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                    {items.length}
                                </span>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto p-2">
                                {items.map((wo) => {
                                    // Unassigned orders can carry an empty value or the legacy "Unassigned" marker
                                    const unassigned = !wo.assignedTo || wo.assignedTo === "Unassigned";
                                    const canSelfAssign = isMaintainer && (wo.status === "PENDING_APPROVAL" || unassigned);
                                    return (
                                        <article
                                            key={wo.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, wo.id)}
                                            className="cursor-grab space-y-2 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-mono text-xs text-muted-foreground">{wo.id.substring(0, 8)}</span>
                                                <PriorityPill priority={wo.priority} />
                                            </div>
                                            <h4
                                                className="cursor-pointer text-sm font-medium leading-tight hover:text-primary"
                                                onClick={() => router.push(`/work-orders/${wo.id}`)}
                                            >
                                                {wo.title}
                                            </h4>
                                            <p className="line-clamp-2 text-xs text-muted-foreground">{wo.description}</p>

                                            <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                                                <button
                                                    type="button"
                                                    disabled={!isAdminOrSupervisor && !canSelfAssign}
                                                    className={cn(
                                                        "flex items-center gap-1 rounded px-1 py-0.5 transition-colors",
                                                        (isAdminOrSupervisor || canSelfAssign) && "hover:bg-accent hover:text-accent-foreground"
                                                    )}
                                                    onClick={() => {
                                                        if (isAdminOrSupervisor) setAssigningWo({ id: wo.id, techId: wo.assignedTechnicianId });
                                                        else if (canSelfAssign) handleSelfAssign(wo.id);
                                                    }}
                                                    title={isAdminOrSupervisor ? "Cambia assegnazione" : canSelfAssign ? "Prendi in carico" : undefined}
                                                >
                                                    <User className={cn("h-3 w-3", unassigned && "text-warning-strong")} />
                                                    <span className={cn(unassigned && "font-medium text-warning-strong")}>
                                                        {unassigned ? (isMaintainer ? "Prendi in carico" : "Da assegnare") : wo.assignedTo.split(" ")[0]}
                                                    </span>
                                                </button>
                                                <span className="flex items-center gap-1 tabular-nums">
                                                    <Calendar className="h-3 w-3" />
                                                    {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) : "--/--"}
                                                </span>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            <WOAssignDialog
                workOrderId={assigningWo?.id || null}
                currentTechnicianId={assigningWo?.techId}
                onClose={() => setAssigningWo(null)}
            />
            {confirmDialog}
        </>
    );
}
