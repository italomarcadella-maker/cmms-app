"use client";

import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";

interface RequestStatsProps {
    requests: any[]; // Replace with proper type if available
}

export function RequestStats({ requests }: RequestStatsProps) {
    const t = useT();
    const total = requests.length;
    const open = requests.filter(r => r.status === 'OPEN').length;
    const approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;

    const stats = [
        {
            label: tk("Totali"),
            value: total,
            icon: CircleDashed,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            label: tk("In Attesa"),
            value: open,
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            label: tk("Approvate"),
            value: approved,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        },
        {
            label: tk("Respinte"),
            value: rejected,
            icon: XCircle,
            color: "text-red-500",
            bg: "bg-red-50"
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <div key={i} className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">{t(stat.label)}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={cn("p-2 rounded-lg", stat.bg, stat.color)}>
                        <stat.icon className="h-5 w-5" />
                    </div>
                </div>
            ))}
        </div>
    );
}
