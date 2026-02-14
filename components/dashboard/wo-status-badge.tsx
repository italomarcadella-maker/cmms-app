"use client";

import { cn } from "@/lib/utils";

export const WOStatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        OPEN: "bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20",
        IN_PROGRESS: "bg-purple-500/10 text-purple-700 border-purple-500/20 hover:bg-purple-500/20",
        COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20",
        PENDING_APPROVAL: "bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/20",
        CLOSED: "bg-gray-500/10 text-gray-700 border-gray-500/20 hover:bg-gray-500/20",
        CANCELED: "bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/20",
        ASSIGNED: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 hover:bg-indigo-500/20",
    };
    const labels: Record<string, string> = {
        OPEN: "Aperto",
        IN_PROGRESS: "In Corso",
        COMPLETED: "Completato",
        PENDING_APPROVAL: "In Attesa",
        CLOSED: "Chiuso",
        CANCELED: "Annullato",
        ASSIGNED: "Assegnato"
    };
    return (
        <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider transition-colors shadow-sm", styles[status] || styles.CLOSED)}>
            {labels[status] || status}
        </span>
    );
};
