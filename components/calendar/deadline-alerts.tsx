"use client";

import { WorkOrder } from "@/lib/types";
import { AlertCircle, ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { format, isBefore, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export function DeadlineAlerts({ workOrders }: { workOrders: WorkOrder[] }) {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    // Filter tasks due within the next 7 days or overdue
    const upcomingDeadlines = workOrders
        .filter(wo => wo.status !== 'COMPLETED')
        .filter(wo => {
            if (!wo.dueDate) return false;
            const due = parseISO(wo.dueDate);
            return isBefore(due, nextWeek);
        })
        .sort((a, b) => {
            if (!a.dueDate || !b.dueDate) return 0;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
        .slice(0, 3); // Top 3

    if (upcomingDeadlines.length === 0) return null;

    return (
        <div className="rounded-xl border bg-orange-50/50 border-orange-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-semibold text-sm">Scadenze Imminenti</h3>
            </div>
            <div className="space-y-2">
                {upcomingDeadlines.map(wo => {
                    if (!wo.dueDate) return null;
                    const isOverdue = isBefore(parseISO(wo.dueDate), today);
                    return (
                        <div key={wo.id} className="flex items-center justify-between p-2 bg-white rounded border border-orange-100 text-sm">
                            <div className="flex flex-col">
                                <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]" title={wo.title}>
                                    {wo.title}
                                </span>
                                <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                                    {isOverdue ? "Scaduto il " : "Scade il "}
                                    {format(parseISO(wo.dueDate), "d MMM", { locale: it })}
                                </span>
                            </div>
                            <Link href={`/work-orders/${wo.id}`} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    );
                })}
            </div>
            <Link href="/calendar" className="block text-center text-xs text-orange-700 font-medium mt-3 hover:underline">
                Vedi Calendario Completo
            </Link>
        </div>
    );
}
