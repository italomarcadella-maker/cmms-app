"use client";

import React, { useState } from "react"; // Added useState
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAuth } from "@/lib/auth-context";
import { WorkOrderStatus, WorkOrder } from "@/lib/types";
import { WOPriorityBadge } from "./wo-priority-badge";
import { User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { WOAssignDialog } from "./wo-assign-dialog";

const COLUMNS: { id: WorkOrderStatus; label: string }[] = [
    { id: 'PENDING_APPROVAL', label: 'Richiesta' },
    { id: 'APPROVED', label: 'Approvato' },
    { id: 'ASSIGNED', label: 'Assegnato' },
    { id: 'IN_PROGRESS', label: 'In Corso' },
    { id: 'COMPLETED', label: 'Eseguito' },
    { id: 'CLOSED', label: 'Validato' },
];

export function WorkOrderKanban({ workOrders }: { workOrders: WorkOrder[] }) {
    const { updateWorkOrderStatus } = useWorkOrders();
    const { user } = useAuth();

    const [assigningWo, setAssigningWo] = React.useState<{ id: string, techId?: string } | null>(null);

    const isAdminOrSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
    const isMaintainer = user?.role === 'MAINTAINER';

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("woId", id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, status: WorkOrderStatus) => {
        const id = e.dataTransfer.getData("woId");
        if (id) {
            updateWorkOrderStatus(id, status);
        }
    };

    // Import dynamically or assume it's available via context/props? 
    // Ideally we should call the server action. 
    // But since this is a client component, we can import the server action if 'use server' is set on the file.
    // However, importing directly might cause issues if not carefully handled in Next.js.
    // Let's use a wrapper or just import it. available from @/lib/actions

    const handleSelfAssign = async (woId: string) => {
        if (!confirm("Vuoi prendere in carico questo ordine di lavoro?")) return;

        const { assignWorkOrderToSelf } = await import("@/lib/actions");
        const res = await assignWorkOrderToSelf(woId);
        if (res.success) {
            // update local state or refresh? 
            // Context might not update automatically if it depends on polling or manual refresh.
            // Ideally useWorkOrders should have a refresh.
            window.location.reload(); // Simple refresh for now or trigger revalidation
        } else {
            alert(res.message);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-200px)] overflow-x-auto">
                {COLUMNS.map((col) => (
                    <div
                        key={col.id}
                        className="flex flex-col rounded-lg bg-muted/40 border h-full"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className="p-3 font-semibold text-sm border-b bg-muted/60 flex justify-between items-center">
                            {col.label}
                            <span className="text-xs bg-background px-2 py-0.5 rounded-full border">
                                {workOrders.filter(wo => wo.status === col.id).length}
                            </span>
                        </div>
                        <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                            {workOrders
                                .filter(wo => wo.status === col.id)
                                .map(wo => (
                                    <div
                                        key={wo.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, wo.id)}
                                        className="p-3 rounded-md border bg-card shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-mono text-muted-foreground">{wo.id}</span>
                                            <WOPriorityBadge priority={wo.priority} />
                                        </div>
                                        <h4 className="font-medium text-sm mb-1 leading-tight">{wo.title}</h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{wo.description}</p>

                                        <div className="flex items-center justify-between mt-auto pt-2 border-t text-xs text-muted-foreground">
                                            <div
                                                className={cn(
                                                    "flex items-center gap-1 p-1 rounded transition-colors",
                                                    isAdminOrSupervisor ? "hover:bg-muted cursor-pointer" : "",
                                                    isMaintainer && (wo.status === 'PENDING_APPROVAL' || wo.assignedTo === 'Unassigned') ? "hover:bg-blue-50 cursor-pointer text-blue-600" : ""
                                                )}
                                                onClick={() => {
                                                    if (isAdminOrSupervisor) {
                                                        setAssigningWo({ id: wo.id, techId: wo.assignedTechnicianId });
                                                    } else if (isMaintainer && (wo.status === 'PENDING_APPROVAL' || wo.assignedTo === 'Unassigned')) {
                                                        handleSelfAssign(wo.id);
                                                    }
                                                }}
                                                title={isAdminOrSupervisor ? "Cambia assegnazione" : (isMaintainer ? "Prendi in carico" : "Solo Admin/Supervisor")}
                                            >
                                                <User className={cn("h-3 w-3", wo.assignedTo === 'Unassigned' ? "text-amber-500" : "")} />
                                                <span className={cn(
                                                    wo.assignedTo === 'Unassigned' ? "text-amber-600 font-medium" : "",
                                                    isMaintainer && wo.assignedTo === 'Unassigned' ? "underline decoration-blue-400 underline-offset-2" : ""
                                                )}>
                                                    {wo.assignedTo === 'Unassigned' && isMaintainer ? "Prendi in carico" : wo.assignedTo.split(' ')[0]}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '--/--'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>

            <WOAssignDialog
                workOrderId={assigningWo?.id || null}
                currentTechnicianId={assigningWo?.techId}
                onClose={() => setAssigningWo(null)}
            />
        </>
    );
}
