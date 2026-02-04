"use client";

import { useState, useEffect } from "react";
import { getAssetMaintenanceEvents } from "@/lib/actions";
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Wrench, AlertTriangle, CheckCircle2, Clock, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

import { SlotCreationDialog } from "@/components/planning/slot-creation-dialog";
import { AISuggestionDialog } from "@/components/planning/ai-suggestion-dialog";
import { LineSettingsDialog } from "@/components/planning/line-settings-dialog";

export default function AssetCalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [loading, setLoading] = useState(true);

    const [slots, setSlots] = useState<any[]>([]); // Production Slots
    const [lines, setLines] = useState<any[]>([]); // Production Line Rules

    const [creatingSlot, setCreatingSlot] = useState<{ line: string, date: Date } | null>(null);
    const [suggestionSlot, setSuggestionSlot] = useState<any | null>(null);
    const [editingLine, setEditingLine] = useState<string | null>(null);

    const refreshData = () => {
        setLoading(true);
        Promise.all([
            getAssetMaintenanceEvents(),
            // Fetch line rules
            import('@/lib/actions').then(m => m.getProductionLines())
        ]).then(([eventsData, linesData]) => {
            setEvents(eventsData);
            setLines(linesData);
            setLoading(false);
        });
    };

    useEffect(() => {
        refreshData();
    }, [currentDate]); // Reload on date change ideally, but keeping simple

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
                        // Group events and lines
                        (() => {
                            // 1. Get all unique lines from both events and settings
                            const eventLines = Array.from(new Set(events.map(e => e.line).filter(Boolean)));
                            const settingLines = lines.map(l => l.line);
                            const allLines = Array.from(new Set([...eventLines, ...settingLines])).sort();

                            if (allLines.length === 0) {
                                return (
                                    <div className="p-8 text-center bg-muted/20 rounded-lg m-4">
                                        <p className="text-muted-foreground mb-4">Nessuna Linea o Evento Trovato.</p>
                                        <button
                                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm"
                                            onClick={() => {
                                                import('@/lib/actions').then(m => m.updateProductionLine({
                                                    line: 'Linea A',
                                                    prodStartDay: 1, prodStartTime: "06:00",
                                                    prodEndDay: 5, prodEndTime: "22:00",
                                                    maintStart: "08:00", maintEnd: "17:00",
                                                    maintStartDay: 1, maintEndDay: 5
                                                })).then(refreshData);
                                            }}
                                        >
                                            Inizializza Demo Linea A
                                        </button>
                                    </div>
                                );
                            }

                            return allLines.map((lineName, lineIdx) => {
                                // Find settings or use default
                                const lineRule = lines.find(l => l.line === lineName) || {
                                    prodStartDay: 1, // Mon
                                    prodEndDay: 5,   // Fri
                                    line: lineName
                                };

                                return (
                                    <div key={lineIdx} className="divide-y border-b last:border-0 relative">
                                        <div className="grid grid-cols-8 divide-x hover:bg-slate-50 transition-colors">
                                            <div className="p-4 text-sm font-bold flex flex-col justify-center items-start gap-1 bg-slate-100 uppercase tracking-widest text-slate-500 sticky left-0 z-10 group/line min-h-[100px] border-r border-b-2 border-white">
                                                <div className="flex w-full justify-between items-center">
                                                    <span>{lineName}</span>
                                                    <button
                                                        onClick={() => setEditingLine(lineName)}
                                                        className={cn("hover:bg-white p-1 rounded transition-opacity", lines.find(l => l.line === lineName) ? "opacity-0 group-hover/line:opacity-100" : "opacity-100 text-blue-500 animate-pulse")}
                                                        title="Configura Turni"
                                                    >
                                                        <Settings className={cn("h-4 w-4", !lines.find(l => l.line === lineName) && "text-blue-600")} />
                                                    </button>
                                                </div>
                                                {!lines.find(l => l.line === lineName) && (
                                                    <div className="text-[10px] text-blue-600 font-normal normal-case">
                                                        Configura turni →
                                                    </div>
                                                )}
                                            </div>
                                            {days.map((day, dayIdx) => {
                                                // 1. Determine Line Status
                                                const dayOfWeek = day.getDay(); // 0=Sun

                                                // Handle Production Window
                                                const prodStartDay = lineRule.prodStartDay;
                                                const prodEndDay = lineRule.prodEndDay;
                                                const isProdDay = (dayOfWeek >= prodStartDay && dayOfWeek <= prodEndDay);

                                                // Handle Maintenance Window
                                                // Default logic: Mon-Fri (1-5) OR if weekend overrides are present
                                                let isMaintDay = false;
                                                const lr = lineRule as any;

                                                // 1. Standard Mon-Fri Check (using stored days or defaults 1-5)
                                                // We rely on maintStartDay/EndDay usually being 1-5 now, but let's check explicit overrides first

                                                // Check Standard Week Block (Mon-Fri usually)
                                                const startD = lr.maintStartDay ?? 1;
                                                const endD = lr.maintEndDay ?? 5;
                                                if (dayOfWeek >= startD && dayOfWeek <= endD) {
                                                    isMaintDay = true;
                                                }

                                                // 2. Saturday Override
                                                if (dayOfWeek === 6 && lr.maintSatStart) {
                                                    isMaintDay = true;
                                                }

                                                // 3. Sunday Override
                                                if (dayOfWeek === 0 && lr.maintSunStart) {
                                                    isMaintDay = true;
                                                }

                                                let bgClass = "bg-gray-100";
                                                let title = "Fuori Turno (Chiuso)";
                                                let isMaintWindow = false;

                                                if (isProdDay) {
                                                    // Production is priority
                                                    bgClass = "bg-red-50/50 border-l-4 border-l-red-500/20";
                                                    title = "Produzione Attiva";
                                                } else if (isMaintDay) {
                                                    // Maintenance Window (Green)
                                                    bgClass = "bg-green-50/50 border-l-4 border-l-green-500/20";
                                                    title = "Finestra Manutenzione Utilizzabile";
                                                    isMaintWindow = true;
                                                }

                                                // Filter events for this Line (any asset)
                                                const dayEvents = events.filter(e => e.line === lineName && isSameDay(new Date(e.start), day));

                                                return (
                                                    <div key={dayIdx} className="p-2 min-h-[100px] relative group border-r last:border-r-0 border-b relative">
                                                        {/* Background Layer */}
                                                        <div className={cn("absolute inset-0 -z-0 ml-0.5 transition-colors duration-500", bgClass)} title={title}>
                                                            {isMaintWindow && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSuggestionSlot({
                                                                            line: lineName,
                                                                            startTime: day,
                                                                            endTime: addDays(day, 1),
                                                                            type: 'MAINTENANCE_WINDOW'
                                                                        });
                                                                    }}
                                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/90 p-1.5 rounded-full shadow-sm hover:scale-110 transition-all z-20 cursor-pointer"
                                                                    title="Chiedi suggerimenti all'AI"
                                                                >
                                                                    <Sparkles className="h-4 w-4 text-indigo-500" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col gap-1 relative z-10">
                                                            {dayEvents.slice(0, 3).map((evt: any) => (
                                                                <div
                                                                    key={evt.id}
                                                                    className={cn(
                                                                        "text-[10px] px-1.5 py-1 rounded border shadow-sm cursor-pointer hover:opacity-80 transition-opacity truncate bg-white/80",
                                                                        getStatusColor(evt.status, evt.category)
                                                                    )}
                                                                    title={`${evt.assetName}: ${evt.title}`}
                                                                >
                                                                    <span className="font-bold mr-1">[{evt.assetName}]</span>
                                                                    {evt.title}
                                                                </div>
                                                            ))}
                                                            {dayEvents.length > 3 && (
                                                                <div className="text-[10px] text-muted-foreground pl-1">
                                                                    + altri {dayEvents.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()
                    )}
                    {!loading && events.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                            <p>Nessun intervento programmato per questa settimana.</p>
                        </div>
                    )}
                </div>
            </div>

            {editingLine && (
                <LineSettingsDialog
                    line={editingLine}
                    currentSettings={lines.find(l => l.line === editingLine)}
                    onClose={() => setEditingLine(null)}
                    onSuccess={refreshData}
                />
            )}

            {suggestionSlot && (
                <AISuggestionDialog
                    slot={suggestionSlot}
                    onClose={() => setSuggestionSlot(null)}
                />
            )}

            {/* Legend */}
            {/* Legend */}
            <div className="flex flex-col sm:flex-row gap-6 text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg border">
                <div className="space-y-2">
                    <span className="font-semibold text-foreground">Stato Linea (Sfondo)</span>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2" title="La linea è in produzione. Manutenzione possibile solo a fermo macchina."><span className="w-4 h-4 rounded bg-red-50 border-l-4 border-l-red-500/20 border border-red-100"></span> Produzione Attiva</div>
                        <div className="flex items-center gap-2" title="La linea è ferma o disponibile per manutenzione."><span className="w-4 h-4 rounded bg-green-50 border-l-4 border-l-green-500/20 border border-green-100"></span> Finestra Manutenzione</div>
                        <div className="flex items-center gap-2" title="La linea è chiusa / fuori turno."><span className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></span> Fuori Turno</div>
                    </div>
                </div>
                <div className="w-px bg-border hidden sm:block"></div>
                <div className="space-y-2">
                    <span className="font-semibold text-foreground">Tipi Intervento</span>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-100 border border-red-200"></span> Guasto</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span> Preventiva</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span> Pianificata</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span> Completata</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
