"use client";

import { useState, useEffect } from "react";
import { getAssetMaintenanceEvents, rescheduleWorkOrder } from "@/lib/actions";
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Wrench, AlertTriangle, CheckCircle2, Clock, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { SlotCreationDialog } from "@/components/planning/slot-creation-dialog";
import { AISuggestionDialog } from "@/components/planning/ai-suggestion-dialog";
import { LineSettingsDialog } from "@/components/planning/line-settings-dialog";

// DnD Kit Imports
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';

// --- Draggable Event Component ---
function DraggableEvent({ event, getStatusColor }: { event: any, getStatusColor: any }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: event.id,
        data: { event }
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "text-[10px] px-1.5 py-1 rounded border shadow-sm cursor-grab hover:opacity-80 transition-opacity truncate bg-white/80 active:cursor-grabbing",
                getStatusColor(event.status, event.category),
                isDragging && "opacity-50 ring-2 ring-blue-500 z-50"
            )}
            title={`${event.assetName}: ${event.title}`}
        >
            <span className="font-bold mr-1">[{event.assetName}]</span>
            {event.title}
        </div>
    );
}

// --- Droppable Day Cell ---
function DroppableDay({ day, lineName, children, onDrop }: { day: Date, lineName: string, children: React.ReactNode, onDrop?: any }) {
    // We create a unique ID including line and date to know exactly where it dropped
    const droppableId = `${lineName}::${day.toISOString()}`;

    const { setNodeRef, isOver } = useDroppable({
        id: droppableId,
        data: { day, lineName }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col gap-1 relative z-10 min-h-[50px] transition-colors p-1 rounded",
                isOver && "bg-blue-500/10 ring-2 ring-inset ring-blue-500"
            )}
        >
            {children}
        </div>
    );
}


export default function AssetCalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [loading, setLoading] = useState(true);
    const [lines, setLines] = useState<any[]>([]);
    const [suggestionSlot, setSuggestionSlot] = useState<any | null>(null);
    const [editingLine, setEditingLine] = useState<string | null>(null);
    const [activeDragEvent, setActiveDragEvent] = useState<any | null>(null);

    const refreshData = () => {
        setLoading(true);
        Promise.all([
            getAssetMaintenanceEvents(),
            import('@/lib/actions').then(m => m.getProductionLines()) // Dynamic import to avoid client-side cluttering if possible, but standard import is fine too
        ]).then(([eventsData, linesData]) => {
            setEvents(eventsData);
            setLines(linesData);
            setLoading(false);
        });
    };

    useEffect(() => {
        refreshData();
    }, [currentDate]);

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDragEvent(null);
        const { active, over } = event;

        if (!over) return;

        const eventId = active.id as string;
        const [targetLine, targetDateStr] = (over.id as string).split('::');
        const targetDate = new Date(targetDateStr);

        // Optimistic Update
        const originalEvents = [...events];
        const updatedEvents = events.map(ev => {
            if (ev.id === eventId) {
                return { ...ev, start: targetDate, line: targetLine }; // Update line if moving between lines too? For now just Date.
            }
            return ev;
        });
        setEvents(updatedEvents);

        // Server Action
        try {
            const result = await rescheduleWorkOrder(eventId, targetDate);
            if (!result.success) {
                toast.error(result.message);
                setEvents(originalEvents); // Revert
            } else {
                toast.success(`Intervento spostato al ${format(targetDate, 'd MMM')}`);
            }
        } catch (error) {
            toast.error("Errore di connessione");
            setEvents(originalEvents);
        }
    };

    const handleDragStart = (event: any) => {
        setActiveDragEvent(event.active.data.current?.event);
    };

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endOfWeek(startDate, { weekStartsOn: 1 }) });

    const getStatusColor = (status: string, category: string) => {
        if (category === 'BREAKDOWN' || status === 'STOPPAGE') return "bg-red-100 text-red-700 border-red-200";
        if (status === 'COMPLETED' || status === 'CLOSED') return "bg-green-100 text-green-700 border-green-200";
        if (category === 'PREVENTIVE') return "bg-blue-100 text-blue-700 border-blue-200";
        return "bg-amber-100 text-amber-700 border-amber-200";
    };

    return (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
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

                <div className="border rounded-xl bg-card shadow-sm overflow-hidden select-none"> {/* Select none to help DnD */}
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
                            (() => {
                                const eventLines = Array.from(new Set(events.map(e => e.line).filter(Boolean)));
                                const settingLines = lines.map(l => l.line);
                                const allLines = Array.from(new Set([...eventLines, ...settingLines])).sort();

                                if (allLines.length === 0) {
                                    return (
                                        <div className="p-8 text-center bg-muted/20 rounded-lg m-4 border border-dashed h-[200px] flex flex-col items-center justify-center">
                                            <p className="text-muted-foreground font-medium">Nessuna Linea di Produzione attiva.</p>
                                        </div>
                                    );
                                }

                                return allLines.map((lineName, lineIdx) => {
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
                                                </div>
                                                {days.map((day, dayIdx) => {
                                                    const dayOfWeek = day.getDay();
                                                    const prodStartDay = lineRule.prodStartDay;
                                                    const prodEndDay = lineRule.prodEndDay;
                                                    const isProdDay = (dayOfWeek >= prodStartDay && dayOfWeek <= prodEndDay);

                                                    let isMaintDay = false;
                                                    const lr = lineRule as any;
                                                    const startD = lr.maintStartDay ?? 1;
                                                    const endD = lr.maintEndDay ?? 5;
                                                    if (dayOfWeek >= startD && dayOfWeek <= endD) isMaintDay = true;
                                                    if (dayOfWeek === 6 && lr.maintSatStart) isMaintDay = true;
                                                    if (dayOfWeek === 0 && lr.maintSunStart) isMaintDay = true;

                                                    let bgClass = "bg-gray-100";
                                                    let isMaintWindow = false;

                                                    if (isProdDay) {
                                                        bgClass = "bg-red-50/50 border-l-4 border-l-red-500/20";
                                                    } else if (isMaintDay) {
                                                        bgClass = "bg-green-50/50 border-l-4 border-l-green-500/20";
                                                        isMaintWindow = true;
                                                    }

                                                    const dayEvents = events.filter(e => e.line === lineName && isSameDay(new Date(e.start), day));

                                                    return (
                                                        <div key={dayIdx} className="p-2 min-h-[100px] relative group border-r last:border-r-0 border-b relative">
                                                            <div className={cn("absolute inset-0 -z-0 ml-0.5 transition-colors duration-500", bgClass)}>
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
                                                                    >
                                                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Droppable Zone */}
                                                            <DroppableDay day={day} lineName={lineName}>
                                                                {dayEvents.map((evt: any) => (
                                                                    <DraggableEvent
                                                                        key={evt.id}
                                                                        event={evt}
                                                                        getStatusColor={getStatusColor}
                                                                    />
                                                                ))}
                                                            </DroppableDay>

                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()
                        )}
                    </div>
                </div>

                <DragOverlay>
                    {activeDragEvent ? (
                        <div
                            className={cn(
                                "text-[10px] px-1.5 py-1 rounded border shadow-lg cursor-grabbing bg-white/90 w-[150px]",
                                getStatusColor(activeDragEvent.status, activeDragEvent.category)
                            )}
                        >
                            <span className="font-bold mr-1">[{activeDragEvent.assetName}]</span>
                            {activeDragEvent.title}
                        </div>
                    ) : null}
                </DragOverlay>

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

                <div className="flex flex-col sm:flex-row gap-6 text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg border">
                    <div className="space-y-2">
                        <span className="font-semibold text-foreground">Stato Linea (Sfondo)</span>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2" title="La linea è in produzione."><span className="w-4 h-4 rounded bg-red-50 border-l-4 border-l-red-500/20 border border-red-100"></span> Produzione Attiva</div>
                            <div className="flex items-center gap-2" title="La linea è libera."><span className="w-4 h-4 rounded bg-green-50 border-l-4 border-l-green-500/20 border border-green-100"></span> Finestra Utilizzabile (Drag & Drop attivo)</div>
                        </div>
                    </div>
                </div>
            </div>
        </DndContext>
    );
}
