"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, User as UserIcon, Calendar as CalendarIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTechnicianAvailability, setTechnicianStatus, getAllTechnicians } from "@/lib/availability-actions";
import { toast } from "sonner";

// Mock types for now until Prisma is generated and types are inferred
type Technician = {
    id: string;
    name: string | null;
    role: string;
    image: string | null;
};

type Availability = {
    id: string;
    userId: string;
    date: Date;
    status: string;
    notes: string | null;
};

const STATUS_CONFIG: Record<string, { label: string, color: string, short: string }> = {
    AVAILABLE: { label: "Presente", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", short: "P" },
    VACATION: { label: "Ferie", color: "bg-blue-500/10 text-blue-600 border-blue-200", short: "F" },
    SICK: { label: "Malattia", color: "bg-red-500/10 text-red-600 border-red-200", short: "M" },
    TRAINING: { label: "Formazione", color: "bg-purple-500/10 text-purple-600 border-purple-200", short: "C" },
    PERMIT: { label: "Permesso", color: "bg-amber-500/10 text-amber-600 border-amber-200", short: "H" },
};

export function TechnicianCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    useEffect(() => {
        loadData();
    }, [currentDate]);

    async function loadData() {
        setLoading(true);
        try {
            const techs = await getAllTechnicians();
            setTechnicians(techs);

            const avail = await getTechnicianAvailability(monthStart, monthEnd);

            // Transform array to map: user_id -> date_string -> status
            const map: Record<string, Record<string, string>> = {};
            avail.forEach((record: any) => {
                if (!map[record.userId]) map[record.userId] = {};
                const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
                map[record.userId][dateKey] = record.status;
            });
            setAvailabilityMap(map);

        } catch (error) {
            console.error("Failed to load calendar data", error);
            toast.error("Errore caricamento dati calendario");
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(userId: string, date: Date) {
        // Toggle logic: AVAILABLE -> VACATION -> SICK -> TRAINING -> AVAILABLE
        const dateKey = format(date, 'yyyy-MM-dd');
        const currentStatus = availabilityMap[userId]?.[dateKey] || 'AVAILABLE';

        let newStatus = 'AVAILABLE';
        if (currentStatus === 'AVAILABLE') newStatus = 'VACATION';
        else if (currentStatus === 'VACATION') newStatus = 'SICK';
        else if (currentStatus === 'SICK') newStatus = 'TRAINING';
        else if (currentStatus === 'TRAINING') newStatus = 'PERMIT';
        else newStatus = 'AVAILABLE';

        // Optimistic update
        const newMap = { ...availabilityMap };
        if (!newMap[userId]) newMap[userId] = {};
        newMap[userId][dateKey] = newStatus;
        setAvailabilityMap(newMap);

        try {
            await setTechnicianStatus(userId, date, newStatus);
            toast.success(`Stato aggiornato: ${STATUS_CONFIG[newStatus].label}`);
        } catch (error) {
            console.error("Failed to update status", error);
            const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
            toast.error(`Errore salvataggio: ${errorMessage}`);
            loadData(); // Revert
        }
    }

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                    {format(currentDate, "MMMM yyyy", { locale: it }).charAt(0).toUpperCase() + format(currentDate, "MMMM yyyy", { locale: it }).slice(1)}
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="p-4 text-left font-medium text-muted-foreground w-[200px] border-b sticky left-0 bg-card z-10">Tecnico</th>
                            {daysInMonth.map(day => (
                                <th key={day.toISOString()} className={cn(
                                    "p-2 text-center border-b min-w-[40px]",
                                    (getDay(day) === 0 || getDay(day) === 6) && "bg-muted/30"
                                )}>
                                    <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: it })}</div>
                                    <div className={cn("font-bold", isToday(day) && "text-primary")}>{format(day, "d")}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {technicians.length === 0 ? (
                            <tr>
                                <td colSpan={daysInMonth.length + 1} className="p-12 text-center text-muted-foreground">
                                    Nessun tecnico trovato nel sistema.
                                </td>
                            </tr>
                        ) : (
                            technicians.map(tech => (
                                <tr key={tech.id} className="group hover:bg-muted/10 transition-colors">
                                    <td className="p-3 border-b border-r sticky left-0 bg-card group-hover:bg-muted/10 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={tech.image || undefined} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                    {tech.name?.substring(0, 2).toUpperCase() || "CN"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="truncate font-medium">{tech.name}</div>
                                        </div>
                                    </td>
                                    {daysInMonth.map(day => {
                                        const dateKey = format(day, 'yyyy-MM-dd');
                                        const status = availabilityMap[tech.id]?.[dateKey] || 'AVAILABLE';
                                        const config = STATUS_CONFIG[status];
                                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                                        return (
                                            <td
                                                key={day.toISOString()}
                                                className={cn(
                                                    "p-1 border-b text-center cursor-pointer transition-colors hover:bg-muted/20 relative",
                                                    isWeekend && "bg-muted/10"
                                                )}
                                                onClick={() => handleStatusChange(tech.id, day)}
                                            >
                                                {status !== 'AVAILABLE' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className={cn(
                                                                "mx-auto h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border",
                                                                config.color
                                                            )}>
                                                                {config.short}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{config.label}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-4 p-4 border rounded-lg bg-card text-xs text-muted-foreground">
                <div className="font-semibold mr-2">Legenda:</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div> Presente (Vuoto)</div>
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'AVAILABLE').map(([key, conf]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border text-[10px]", conf.color)}>{conf.short}</div>
                        {conf.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
