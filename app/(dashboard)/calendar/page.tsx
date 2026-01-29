"use client";

import { useState } from "react";

import { useWorkOrders } from "@/lib/work-orders-context";
import { usePM } from "@/lib/pm-context";
import { CalendarView } from "@/components/calendar/calendar-view";
import { useRouter } from "next/navigation";

import { WOAssignDialog } from "@/components/work-orders/wo-assign-dialog";

import { updatePreventiveSchedule } from "@/lib/actions";
import { toast } from "sonner";

export default function CalendarPage() {
    const { workOrders, updateWorkOrder, addWorkOrder } = useWorkOrders();
    const { schedules, updateSchedule } = usePM(); // Fetch schedules
    const router = useRouter();
    const [assigningWoId, setAssigningWoId] = useState<string | null>(null);

    // Transform Work Orders to Calendar Events
    const woEvents = workOrders
        .filter(wo => wo.dueDate)
        .map(wo => ({
            id: wo.id,
            title: wo.title,
            date: new Date(wo.dueDate!),
            type: 'WO' as const,
            status: wo.status,
            description: wo.description,
            priority: wo.priority,
            assignedTo: wo.assignedTo
        }));

    // Transform Schedules to Calendar Events (Projections)
    const pmEvents = schedules.map(sch => ({
        id: sch.id,
        title: `[Pianificata] ${sch.taskTitle}`,
        date: new Date(sch.nextDueDate),
        type: 'PM' as const,
        status: 'SCHEDULED',
        description: sch.description,
        priority: 'MEDIUM', // Default
        assignedTo: 'Unassigned'
    }));

    const events = [...woEvents, ...pmEvents];

    // Unassigned Pool
    const unassignedEvents = workOrders
        .filter(wo => !wo.dueDate)
        .map(wo => ({
            id: wo.id,
            title: wo.title,
            date: new Date(),
            type: 'WO' as const,
            status: wo.status,
            description: wo.description,
            priority: wo.priority,
            assignedTo: wo.assignedTo
        }));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Calendario Manutenzione
                </h1>
                <p className="text-muted-foreground mt-1">Pianificazione mensile degli interventi.</p>
            </div>

            <CalendarView
                events={events}
                unassignedEvents={unassignedEvents}
                onEventClick={async (event) => {
                    if (event.type === 'WO') {
                        router.push(`/work-orders/${event.id}`);
                    } else if (event.type === 'PM') {
                        const schedule = schedules.find(s => s.id === event.id);
                        if (!schedule) return;

                        // Create WO from PM
                        const newWoId = crypto.randomUUID();
                        const newWo: any = { // Using any as strict type matching might need full object
                            id: newWoId,
                            title: schedule.taskTitle,
                            description: schedule.description,
                            assetId: schedule.assetId,
                            assetName: schedule.assetName,
                            priority: 'MEDIUM',
                            category: 'MECHANICAL', // Default fallback
                            status: 'OPEN',
                            assignedTo: 'Unassigned',
                            dueDate: schedule.nextDueDate, // Keep origin date
                            createdAt: new Date().toISOString(),
                            checklist: schedule.activities.map(a => ({ id: a.id, label: a.label, completed: false })),
                            partsUsed: [],
                            laborLogs: [],
                            originScheduleId: schedule.id
                        };

                        await addWorkOrder(newWo);
                        setAssigningWoId(newWoId);
                    }
                }}
                onEventMove={async (id, newDate) => {
                    console.log("onEventMove Triggered", id, newDate);
                    // Check if it's a WO (assigned or unassigned)
                    const isWo = woEvents.find(e => e.id === id) || unassignedEvents.find(e => e.id === id);

                    if (isWo) {
                        console.log("Moving WO", id);
                        // Update WO due date
                        await updateWorkOrder(id, { dueDate: newDate.toISOString() });
                    } else {
                        // Assume it's a PM since we checked logic
                        const isPm = pmEvents.find(e => e.id === id);
                        console.log("Checking if PM", id, isPm);

                        if (isPm) {
                            console.log("Moving PM", id, "to", newDate);
                            // Optimistic update
                            updateSchedule(id, { nextDueDate: newDate.toISOString() as any });

                            try {
                                const result = await updatePreventiveSchedule(id, newDate);
                                if (result.success) {
                                    toast.success("Data aggiornata");
                                    // router.refresh(); // Not strictly needed if optimistic update works, but good for sync
                                } else {
                                    toast.error(result.message || "Errore aggiornamento");
                                    // Revert if failed (optional, but good practice - requires storing old date)
                                }
                            } catch (e) {
                                toast.error("Si è verificato un errore durante lo spostamento.");
                            }
                        }
                    }
                }}
            />

            <WOAssignDialog
                workOrderId={assigningWoId}
                onClose={() => setAssigningWoId(null)}
            />
        </div>
    );
}
