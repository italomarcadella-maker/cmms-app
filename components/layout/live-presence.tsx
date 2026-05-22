"use client";

import React, { useState } from "react";
import { User, Clock, ShieldAlert, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type OperatorStatus = "ONLINE" | "EXECUTING_TASK" | "WORKING_EWO";

interface Operator {
    id: string;
    name: string;
    role: string;
    specialty: string;
    status: OperatorStatus;
    statusLabel: string;
    activeTask: string;
    location: string;
    color: string;
    avatarInitials: string;
}

const LIVE_OPERATORS: Operator[] = [
    {
        id: "1",
        name: "Mario Rossi",
        role: "Maintenance Technician",
        specialty: "Meccanico Generale",
        status: "ONLINE",
        statusLabel: "Disponibile",
        activeTask: "Ispezione Linea 1 (Stato OK)",
        location: "Linea di Assemblaggio A",
        color: "emerald",
        avatarInitials: "MR",
    },
    {
        id: "2",
        name: "Luigi Verdi",
        role: "Electrical Technician",
        specialty: "Elettricista di Bordo Macchina",
        status: "EXECUTING_TASK",
        statusLabel: "In Attività PM",
        activeTask: "Manutenzione Preventiva PM-09 su Estrusore E1",
        location: "Reparto Estrusione",
        color: "blue",
        avatarInitials: "LV",
    },
    {
        id: "3",
        name: "Anna Bianchi",
        role: "Automation Engineer",
        specialty: "Specialista PLC / Kaizen",
        status: "WORKING_EWO",
        statusLabel: "Emergenza EWO Critico",
        activeTask: "Risoluzione Blocco PLC EWO #102 - Linea Ferma!",
        location: "Stazione Carroponte 3",
        color: "red",
        avatarInitials: "AB",
    },
];

export function LivePresence() {
    const [hoveredOp, setHoveredOp] = useState<string | null>(null);

    return (
        <div className="relative flex items-center gap-2 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all duration-300">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 mr-1 select-none">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-600 dark:text-violet-400">
                    Live Shopfloor
                </span>
            </div>

            {/* Overlapping Avatars */}
            <div className="flex -space-x-2.5">
                {LIVE_OPERATORS.map((op) => {
                    const isHovered = hoveredOp === op.id;
                    const ringColorClass = 
                        op.status === "ONLINE" 
                            ? "ring-emerald-400 dark:ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                            : op.status === "EXECUTING_TASK"
                            ? "ring-blue-400 dark:ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                            : "ring-red-500 dark:ring-red-600 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse";

                    const badgeColorBg =
                        op.status === "ONLINE"
                            ? "bg-emerald-500"
                            : op.status === "EXECUTING_TASK"
                            ? "bg-blue-500"
                            : "bg-red-600 animate-ping";

                    return (
                        <div
                            key={op.id}
                            className="relative cursor-pointer transition-all duration-300 hover:z-30 hover:-translate-y-1"
                            onMouseEnter={() => setHoveredOp(op.id)}
                            onMouseLeave={() => setHoveredOp(null)}
                        >
                            {/* Avatar Circle */}
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white border-2 border-background ring-2 transition-all duration-300",
                                    op.status === "ONLINE" && "bg-gradient-to-br from-emerald-500 to-teal-600",
                                    op.status === "EXECUTING_TASK" && "bg-gradient-to-br from-blue-500 to-indigo-600",
                                    op.status === "WORKING_EWO" && "bg-gradient-to-br from-red-500 to-rose-700",
                                    ringColorClass
                                )}
                            >
                                {op.avatarInitials}
                            </div>

                            {/* Small status dot in corner */}
                            <span className={cn("absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-white", badgeColorBg)} />

                            {/* Glassmorphic Popover Card */}
                            {isHovered && (
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-72 p-4 rounded-2xl border border-white/20 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                                    {/* Card Glow */}
                                    <div 
                                        className={cn(
                                            "absolute -inset-px -z-10 rounded-2xl opacity-20 blur-md transition-all",
                                            op.status === "ONLINE" && "bg-emerald-500",
                                            op.status === "EXECUTING_TASK" && "bg-blue-500",
                                            op.status === "WORKING_EWO" && "bg-red-500 animate-pulse"
                                        )}
                                    />

                                    {/* Operator Details */}
                                    <div className="flex items-start justify-between mb-2.5">
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                                {op.name}
                                            </h4>
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                                                {op.specialty}
                                            </p>
                                        </div>
                                        {/* Status Badge */}
                                        <span
                                            className={cn(
                                                "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                                op.status === "ONLINE" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20",
                                                op.status === "EXECUTING_TASK" && "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-500/20",
                                                op.status === "WORKING_EWO" && "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-500/30 animate-pulse"
                                            )}
                                        >
                                            {op.statusLabel}
                                        </span>
                                    </div>

                                    {/* Task Status */}
                                    <div className="space-y-2 mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                                            {op.status === "WORKING_EWO" ? (
                                                <ShieldAlert className="h-3.5 w-3.5 text-red-500 animate-bounce" />
                                            ) : op.status === "EXECUTING_TASK" ? (
                                                <Clock className="h-3.5 w-3.5 text-blue-500" />
                                            ) : (
                                                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                                            )}
                                            <span className="font-semibold text-[11px] uppercase tracking-wide">
                                                {op.status === "WORKING_EWO" ? "Intervento Critico" : "Attività Corrente"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/40 font-mono text-[11px] leading-relaxed">
                                            {op.activeTask}
                                        </p>
                                    </div>

                                    {/* Location Info */}
                                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                        <Sparkles className="h-3 w-3 text-violet-500" />
                                        <span>Posizione: <strong>{op.location}</strong></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
