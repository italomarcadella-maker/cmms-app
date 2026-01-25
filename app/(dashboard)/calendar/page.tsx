"use client";

import { useWorkOrders } from "@/lib/work-orders-context";
import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
    const { workOrders, updateWorkOrder } = useWorkOrders();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Calendario Manutenzione
                </h1>
                <p className="text-muted-foreground mt-1">Pianificazione mensile degli interventi.</p>
            </div>

            <CalendarView
                workOrders={workOrders}
                onMoveEvent={(id, newDate) => {
                    updateWorkOrder(id, { dueDate: newDate.toISOString() });
                }}
            />
        </div>
    );
}
