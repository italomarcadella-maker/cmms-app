"use client";

import { useState, useEffect } from "react";
import { getAssetMaintenanceEvents } from "@/lib/actions";
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Wrench, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssetCalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAssetMaintenanceEvents().then(data => {
            setEvents(data);
            setLoading(false);
        });
    }, []);

    const startDate = viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfWeek(currentDate, { weekStartsOn: 1 }); // Simplification for grid
    const days = viewMode === 'week'
        ? eachDayOfInterval({ start: startDate, end: endOfWeek(startDate, { weekStartsOn: 1 }) })
        : eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) }); // Keeping it simple for now

    const getStatusColor = (status: string, category: string) => {
        if (category === 'BREAKDOWN' || status === 'STOPPAGE') return "bg-red-100 text-red-700 border-red-200";
        if (status === 'COMPLETED' || status === 'CLOSED') return "bg-green-100 text-green-700 border-green-200";
        if (category === 'PREVENTIVE') return "bg-blue-100 text-blue-700 border-blue-200";
        return "bg-amber-100 text-amber-700 border-amber-200";
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Planning Manutenzione</h1>
                    <p className="text-muted-foreground hidden sm:block">Visualizza la disponibilità degli asset e gli interventi programmati.</p>
                </div>
                <div className="flex items-center gap-2 bg-card border p-1 rounded-lg">
                    <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-2 hover:bg-muted rounded-md"><ChevronLeft className="h-4 w-4" /></button>
                    <div className="px-4 font-medium min-w-[150px] text-center flex items-center justify-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {format(currentDate, "MMMM yyyy", { locale: it })}
                    </div>
                    <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-2 hover:bg-muted rounded-md"><ChevronRight className="h-4 w-4" /></button>
                </div>
            </div>

            <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
                {/* Header Giorni */}
                <div className="grid grid-cols-8 divide-x border-b bg-muted/40">
                    <div className="p-4 font-semibold text-sm text-muted-foreground flex items-center justify-center">ASSET</div>
                    {days.map((day, i) => (
                        <div key={i} className={cn("p-4 text-center text-sm", isSameDay(day, new Date()) && "bg-blue-50/50")}>
                            <div className="font-semibold capitalize">{format(day, "EEE", { locale: it })}</div>
                            <div className={cn("text-xs mt-1", isSameDay(day, new Date()) ? "text-blue-600 font-bold" : "text-muted-foreground")}>
                                {format(day, "d MMM")}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Body Timeline */}
                <div className="divide-y max-h-[600px] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Caricamento planning...</div>
                    ) : (
                        // Group events by Asset
                        // We simulate a list of unique assets from the events for the rows
                        Array.from(new Set(events.map(e => e.assetName))).map((assetName, idx) => {
                            const assetEvents = events.filter(e => e.assetName === assetName);
                            return (
                                <div key={idx} className="grid grid-cols-8 divide-x hover:bg-slate-50 transition-colors">
                                    <div className="p-4 text-sm font-medium flex items-center gap-2 bg-slate-50/30">
                                        <Wrench className="h-3 w-3 text-muted-foreground" />
                                        {assetName}
                                    </div>
                                    {days.map((day, dayIdx) => {
                                        const daysEvents = assetEvents.filter(e => isSameDay(new Date(e.start), day));
                                        return (
                                            <div key={dayIdx} className="p-2 min-h-[80px] relative group">
                                                {daysEvents.map((evt: any) => (
                                                    <div
                                                        key={evt.id}
                                                        className={cn(
                                                            "text-[10px] p-1.5 rounded mb-1 border shadow-sm cursor-pointer hover:opacity-80 transition-opacity truncate",
                                                            getStatusColor(evt.status, evt.category)
                                                        )}
                                                        title={`${evt.title} - ${evt.assignee || 'Non assegnato'}`}
                                                    >
                                                        <div className="font-bold truncate">{evt.title}</div>
                                                        <div className="opacity-75 truncate">{format(new Date(evt.start), "HH:mm")}</div>
                                                    </div>
                                                ))}
                                                {/* Add Button on Hover */}
                                                <button className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center bg-slate-100/50 transition-opacity">
                                                    <span className="text-xs text-slate-500 font-bold">+</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                    {!loading && events.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                            <p>Nessun intervento programmato per questa settimana.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-100 border border-red-200"></span> Guasto / Fermo</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span> Preventiva</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span> Pianificata</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span> Completata</div>
            </div>
        </div>
    );
}
