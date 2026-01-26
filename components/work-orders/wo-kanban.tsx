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
    { id: 'OPEN', label: 'Da Fare' },
    { id: 'IN_PROGRESS', label: 'In Corso' },
    { id: 'PENDING_APPROVAL', label: 'Da Approvare' },
    { id: 'ON_HOLD', label: 'In Attesa' },
    { id: 'COMPLETED', label: 'Completati' },
];

export function WorkOrderKanban({ workOrders }: { workOrders: WorkOrder[] }) {
    const { updateWorkOrderStatus } = useWorkOrders();
    const { user } = useAuth();

    const [assigningWo, setAssigningWo] = React.useState<{ id: string, techId?: string } | null>(null);

    const canAssign = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

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
                                                    canAssign ? "hover:bg-muted cursor-pointer" : "cursor-default"
                                                )}
                                                onClick={() => canAssign && setAssigningWo({ id: wo.id, techId: wo.assignedTechnicianId })}
                                                title={canAssign ? "Cambia assegnazione" : "Solo Admin/Supervisor"}
                                            >
                                                <User className={cn("h-3 w-3", wo.assignedTo === 'Unassigned' ? "text-amber-500" : "")} />
                                                <span className={cn(wo.assignedTo === 'Unassigned' ? "text-amber-600 font-medium" : "")}>
                                                    {wo.assignedTo.split(' ')[0]}
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
