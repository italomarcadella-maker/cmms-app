import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Filter, User, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { UnassignedList } from "./unassigned-list";

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'WO' | 'PM';
    status: string;
    description?: string;
    priority?: string;
    assignedTo?: string;
    // For unassigned pool
    isUnassigned?: boolean;
}

interface CalendarViewProps {
    events: CalendarEvent[];
    unassignedEvents?: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onEventMove?: (eventId: string, newDate: Date) => void;
}

function DraggableEvent({ event, onClick, priorityColor }: { event: CalendarEvent, onClick: () => void, priorityColor: string }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: event.id,
        data: event
    });

    return (
        <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={onClick}
            className={cn(
                "w-full text-left px-1.5 py-1 rounded text-[10px] font-medium truncate flex items-center gap-1.5 shadow-sm border transition-all hover:scale-[1.02] hover:shadow-md cursor-grab active:cursor-grabbing",
                priorityColor,
                event.status === 'COMPLETED' && "opacity-60 grayscale bg-gray-100 border-gray-200 text-gray-500 decoration-slate-400",
                isDragging && "opacity-30"
            )}
            title={event.title}
        >
            <span className="truncate flex-1">{event.title}</span>
            {event.assignedTo && <span className="text-[9px] opacity-70 uppercase tracking-tighter">{event.assignedTo.substring(0, 2)}</span>}
        </button>
    );
}

interface WorkloadIndicatorProps {
    events: CalendarEvent[];
}

function WorkloadIndicator({ events }: WorkloadIndicatorProps) {
    // Assumption: 1 event = 2 hours if not specified (simplification for MVP)
    const hours = events.length * 2;

    // Limits
    const MAX_HOURS = 8;
    const percentage = Math.min(100, (hours / MAX_HOURS) * 100);

    let colorClass = "bg-emerald-500";
    if (hours >= 6 && hours < 8) colorClass = "bg-amber-500";
    if (hours >= 8) colorClass = "bg-red-500";

    if (events.length === 0) return null;

    return (
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1 opacity-50 group-hover:opacity-100 transition-opacity" title={`Carico stimato: ${hours}h`}>
            <div
                className={cn("h-full transition-all duration-500", colorClass)}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

function DroppableDay({ day, children, isToday, isOutsideMonth, events = [] }: { day: Date, children: React.ReactNode, isToday: boolean, isOutsideMonth: boolean, events?: CalendarEvent[] }) {
    const { setNodeRef, isOver } = useDroppable({
        id: day.toISOString(),
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[100px] p-1 border-b border-r relative transition-colors group flex flex-col",
                isOutsideMonth ? "bg-muted/10 text-muted-foreground/50" : "bg-card",
                isToday && "bg-blue-50/30",
                isOver && "bg-primary/10 ring-2 ring-inset ring-primary/20",
            )}
        >
            <div className="flex justify-between items-start mb-1 px-1 pt-1">
                <span className={cn(
                    "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full transition-all",
                    isToday ? "bg-primary text-primary-foreground shadow-sm scale-110" : "text-foreground/70",
                    isOutsideMonth && "opacity-30"
                )}>
                    {format(day, 'd')}
                </span>

                <WorkloadIndicator events={events} />
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[90px] scrollbar-none px-1 pb-1 flex-1">
                {children}
            </div>
        </div>
    );
}

export function CalendarView({ events, unassignedEvents = [], onEventClick, onEventMove }: CalendarViewProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

    // Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    // Filters
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [techFilter, setTechFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

    const nextPeriod = () => {
        if (viewMode === 'month') {
            setCurrentMonth(addMonths(currentMonth, 1));
        } else {
            setCurrentMonth(addDays(currentMonth, 7)); // Move by week
        }
    };

    const prevPeriod = () => {
        if (viewMode === 'month') {
            setCurrentMonth(subMonths(currentMonth, 1));
        } else {
            setCurrentMonth(subDays(currentMonth, 7)); // Move by week
        }
    };

    const goToToday = () => setCurrentMonth(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = viewMode === 'month'
        ? startOfWeek(monthStart, { locale: it })
        : startOfWeek(currentMonth, { locale: it });

    const endDate = viewMode === 'month'
        ? endOfWeek(monthEnd, { locale: it })
        : endOfWeek(currentMonth, { locale: it });

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Filter Logic
    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
            if (techFilter !== "ALL" && e.assignedTo !== techFilter) return false;
            return true;
        });
    }, [events, statusFilter, techFilter]);

    // Unique Technicians for filter
    const technicians = useMemo(() => {
        const techs = new Set<string>();
        events.forEach(e => {
            if (e.assignedTo && e.assignedTo !== 'Unassigned') techs.add(e.assignedTo);
        });
        return Array.from(techs).sort();
    }, [events]);

    const getDayEvents = (day: Date) => {
        return filteredEvents.filter(event => isSameDay(event.date, day));
    };

    const getEventStyle = (event: CalendarEvent) => {
        if (event.type === 'PM') {
            return "border-l-4 border-l-purple-500 bg-purple-50 text-purple-700 border-dashed border-2"; // Dashed border for projection
        }

        switch (event.priority) {
            case 'HIGH': return "border-l-4 border-l-red-500 bg-red-50 text-red-700";
            case 'MEDIUM': return "border-l-4 border-l-amber-500 bg-amber-50 text-amber-700";
            case 'LOW': return "border-l-4 border-l-emerald-500 bg-emerald-50 text-emerald-700";
            default: return "border-l-4 border-l-blue-500 bg-blue-50 text-blue-700";
        }
    };

    const handleDragStart = (event: any) => {
        setDraggedEvent(event.active.data.current || event.active.data);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggedEvent(null);

        if (over && active.id && onEventMove) {
            // Check if dropped on a day
            // over.id is ISOString of the date
            const newDate = new Date(over.id as string);
            onEventMove(active.id as string, newDate);
        }
    };

    if (!isMounted) {
        return <div className="h-[800px] border rounded-xl flex items-center justify-center text-muted-foreground">Caricamento calendario...</div>;
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 h-[800px]">
                {/* Main Calendar Area */}
                <div className="flex-1 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b bg-muted/20 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center border rounded-md bg-background shadow-xs">
                                <button onClick={prevPeriod} className="p-1.5 hover:bg-muted transition-colors rounded-l-md"><ChevronLeft className="h-4 w-4" /></button>
                                <div className="w-px h-4 bg-border" />
                                <button onClick={nextPeriod} className="p-1.5 hover:bg-muted transition-colors rounded-r-md"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                            <h2 className="text-xl font-bold capitalize text-foreground min-w-[150px] text-center sm:text-left">
                                {viewMode === 'month'
                                    ? format(currentMonth, 'MMMM yyyy', { locale: it })
                                    : `Settimana ${format(currentMonth, 'w', { locale: it })}`
                                }
                            </h2>
                            <button
                                onClick={goToToday}
                                className="text-xs font-medium px-2.5 py-1.5 bg-background border rounded-md hover:bg-muted transition-colors"
                            >
                                Oggi
                            </button>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center bg-muted/10 border rounded-md p-1">
                            <button
                                onClick={() => setViewMode('month')}
                                className={cn("text-xs font-medium px-3 py-1 rounded-sm transition-all", viewMode === 'month' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted/50")}
                            >
                                Mese
                            </button>
                            <button
                                onClick={() => setViewMode('week')}
                                className={cn("text-xs font-medium px-3 py-1 rounded-sm transition-all", viewMode === 'week' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted/50")}
                            >
                                Settimana
                            </button>
                        </div>

                        {/* Filter Toolbar */}
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                            <div className="flex items-center gap-2 bg-background border rounded-md px-2 py-1 shadow-sm">
                                <Filter className="h-3 w-3 text-muted-foreground" />
                                <select
                                    className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer text-muted-foreground font-medium pr-1"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">Stato: Tutti</option>
                                    <option value="OPEN">Aperti</option>
                                    <option value="IN_PROGRESS">In Corso</option>
                                    <option value="COMPLETED">Completati</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-background border rounded-md px-2 py-1 shadow-sm">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <select
                                    className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer text-muted-foreground font-medium pr-1"
                                    value={techFilter}
                                    onChange={(e) => setTechFilter(e.target.value)}
                                >
                                    <option value="ALL">Tecnico: Tutti</option>
                                    {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b bg-muted/40">
                        {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map((day, i) => (
                            <div key={day} className={cn("py-2 text-center text-xs font-semibold uppercase tracking-wider", i === 0 || i === 6 ? "text-red-400" : "text-muted-foreground")}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className={cn(
                        "flex-1 grid grid-cols-7 bg-background",
                        viewMode === 'month' ? "grid-rows-6" : "grid-rows-1"
                    )}>
                        {days.map((day, dayIdx) => {
                            const dayEvents = getDayEvents(day);
                            const isOutsideMonth = !isSameMonth(day, monthStart);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <DroppableDay
                                    key={day.toString()}
                                    day={day}
                                    isToday={isToday}
                                    isOutsideMonth={isOutsideMonth && viewMode === 'month'} // In week view we show valid days
                                    events={dayEvents}
                                >
                                    {dayEvents.map(event => (
                                        <DraggableEvent
                                            key={event.id}
                                            event={event}
                                            onClick={() => setSelectedEvent(event)}
                                            priorityColor={getEventStyle(event)}
                                        />
                                    ))}
                                </DroppableDay>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Pool */}
                <div className="w-[280px] shrink-0">
                    <UnassignedList events={unassignedEvents} />
                </div>
            </div>

            <DragOverlay>
                {draggedEvent ? (
                    <button
                        className={cn(
                            "w-full text-left px-1.5 py-1 rounded text-[10px] font-medium truncate flex items-center gap-1.5 shadow-lg ring-2 ring-primary border transition-all scale-105 opacity-80",
                            getEventStyle(draggedEvent),
                            "bg-background/90"
                        )}
                    >
                        <span className="truncate flex-1">{draggedEvent.title}</span>
                        {draggedEvent.assignedTo && <span className="text-[9px] opacity-70 uppercase tracking-tighter">{draggedEvent.assignedTo.substring(0, 2)}</span>}
                    </button>
                ) : null}
            </DragOverlay>

            {/* Event Details Dialog */}
            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className={cn("h-3 w-3 rounded-full", selectedEvent?.type === 'WO' ? "bg-blue-500" : "bg-purple-500")} />
                            {selectedEvent?.title}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEvent?.id} • {selectedEvent && new Date(selectedEvent.date).toLocaleDateString()}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Stato</span>
                                <div className="font-medium">{selectedEvent?.status}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Priorità</span>
                                <div className="font-medium flex items-center gap-1">
                                    {selectedEvent?.priority === 'HIGH' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                    {selectedEvent?.priority || '-'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Assegnato a</span>
                                <div className="font-medium">{selectedEvent?.assignedTo || 'Non assegnato'}</div>
                            </div>
                        </div>

                        {selectedEvent?.description && (
                            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground italic border">
                                "{selectedEvent.description}"
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {selectedEvent?.type === 'PM' ? (
                            <button
                                onClick={() => {
                                    if (selectedEvent) onEventClick(selectedEvent);
                                    setSelectedEvent(null);
                                }}
                                className="bg-purple-600 text-white hover:bg-purple-700 inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 w-full sm:w-auto gap-2 shadow-sm transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" /> Genera e Assegna
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (selectedEvent) onEventClick(selectedEvent);
                                    setSelectedEvent(null);
                                }}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 w-full sm:w-auto gap-2 shadow-sm transition-colors"
                            >
                                Apri Ordine <ExternalLink className="h-4 w-4" />
                            </button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DndContext>
    );
}
