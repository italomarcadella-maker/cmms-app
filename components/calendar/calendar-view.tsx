"use client";

import { useState } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkOrder } from "@/lib/types";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DraggableAttributes,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface CalendarViewProps {
    workOrders: WorkOrder[];
    onMoveEvent?: (workOrderId: string, newDate: Date) => void;
}

// Draggable Event Component
function DraggableEvent({ event, compact = true }: { event: WorkOrder; compact?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: event.id,
        data: { event }, // Pass event data for DragOverlay
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 50,
        opacity: isDragging ? 0 : 1, // Hide original when dragging
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "cursor-grab active:cursor-grabbing",
                compact
                    ? "text-[10px] px-1.5 py-0.5 rounded truncate font-medium mb-1"
                    : "p-3 border rounded-lg bg-background shadow-sm hover:border-primary/50 transition-colors",
                compact && (
                    event.priority === 'HIGH' ? "bg-red-100 text-red-700" :
                        event.priority === 'MEDIUM' ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700"
                ),
                !compact && "bg-white"
            )}
        >
            {compact ? (
                event.title
            ) : (
                <>
                    <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                            "text-[10px] px-1.5 py-0 rounded font-bold uppercase",
                            event.status === 'COMPLETED' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                        )}>
                            {event.status === 'IN_PROGRESS' ? 'In Corso' : event.status === 'COMPLETED' ? 'Fatto' : 'Aperto'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{event.id}</span>
                    </div>
                    <h4 className="font-medium text-sm leading-tight mb-1">{event.title}</h4>
                    <p className="text-xs text-muted-foreground truncate mb-2">{event.description}</p>
                    <div className="text-xs flex items-center gap-2 text-muted-foreground border-t pt-2 mt-2">
                        <span>Assegnato a: <strong className="text-foreground">{event.assignedTo}</strong></span>
                    </div>
                </>
            )}
        </div>
    );
}

// Droppable Day Component
function DroppableDay({
    day,
    children,
    onClick,
    isSelected,
    isCurrentMonth,
    isTodayDate
}: {
    day: Date;
    children: React.ReactNode;
    onClick: () => void;
    isSelected: boolean;
    isCurrentMonth: boolean;
    isTodayDate: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: day.toISOString(),
        data: { date: day },
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "relative p-2 border-b border-r min-h-[80px] cursor-pointer transition-colors flex flex-col justify-between",
                !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                isSelected && "ring-2 ring-inset ring-primary bg-primary/5",
                isTodayDate && "bg-blue-50/50",
                isOver && "bg-primary/10 ring-2 ring-primary ring-inset" // Highlight on hover
            )}
        >
            {children}
        </div>
    );
}

export function CalendarView({ workOrders, onMoveEvent }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [activeDragEvent, setActiveDragEvent] = useState<WorkOrder | null>(null);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const jumpToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(today);
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const selectedDayEvents = selectedDate
        ? workOrders.filter(wo => isSameDay(new Date(wo.dueDate), selectedDate))
        : [];

    const handleDragStart = (event: any) => {
        if (event.active.data.current?.event) {
            setActiveDragEvent(event.active.data.current.event);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragEvent(null);

        if (over && active.id && onMoveEvent) {
            const newDateString = over.id as string;
            const newDate = new Date(newDateString);

            // Check if dropped on a valid date
            if (!isNaN(newDate.getTime())) {
                onMoveEvent(active.id as string, newDate);
            }
        }
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold capitalize">
                                {format(currentMonth, "MMMM yyyy", { locale: it })}
                            </h2>
                            <button onClick={jumpToday} className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80">
                                Oggi
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={prevMonth} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={nextMonth} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b bg-muted/30">
                        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
                            <div key={day} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-6">
                        {calendarDays.map((day, dayIdx) => {
                            const dayEvents = workOrders.filter(wo => isSameDay(new Date(wo.dueDate), day));
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <DroppableDay
                                    key={day.toISOString()}
                                    day={day}
                                    onClick={() => setSelectedDate(day)}
                                    isSelected={!!isSelected}
                                    isCurrentMonth={isCurrentMonth}
                                    isTodayDate={isToday(day)}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={cn(
                                            "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                                            isToday(day) && "bg-blue-500 text-white shadow-sm"
                                        )}>
                                            {format(day, "d")}
                                        </span>
                                    </div>

                                    <div className="space-y-1 mt-1">
                                        {dayEvents.slice(0, 3).map(ev => (
                                            <DraggableEvent key={ev.id} event={ev} compact={true} />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[10px] text-muted-foreground pl-1">
                                                + altri {dayEvents.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </DroppableDay>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar / Details Panel */}
                <div className="w-full lg:w-80 bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
                    <div className="p-4 border-b bg-muted/40">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Attività del {selectedDate ? format(selectedDate, "d MMMM", { locale: it }) : "..."}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {!selectedDate ? (
                            <div className="text-center text-muted-foreground text-sm py-8">Seleziona una data</div>
                        ) : selectedDayEvents.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-8 italic flex flex-col items-center gap-2">
                                <CalendarIcon className="h-8 w-8 text-neutral-300" />
                                Nessuna attività pianificata.
                            </div>
                        ) : (
                            selectedDayEvents.map(wo => (
                                <div key={wo.id}>
                                    {/* Sidebar items are NOT draggable for now, just view */}
                                    <div className="p-3 border rounded-lg bg-background shadow-sm hover:border-primary/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0 rounded font-bold uppercase",
                                                wo.status === 'COMPLETED' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                                            )}>
                                                {wo.status === 'IN_PROGRESS' ? 'In Corso' : wo.status === 'COMPLETED' ? 'Fatto' : 'Aperto'}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">{wo.id}</span>
                                        </div>
                                        <h4 className="font-medium text-sm leading-tight mb-1">{wo.title}</h4>
                                        <p className="text-xs text-muted-foreground truncate mb-2">{wo.description}</p>
                                        <div className="text-xs flex items-center gap-2 text-muted-foreground border-t pt-2 mt-2">
                                            <span>Assegnato a: <strong className="text-foreground">{wo.assignedTo}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeDragEvent ? (
                    <div className="opacity-80 rotate-2 pointer-events-none w-[150px]">
                        <div className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded truncate font-medium border shadow-lg",
                            activeDragEvent.priority === 'HIGH' ? "bg-red-100 text-red-700 border-red-200" :
                                activeDragEvent.priority === 'MEDIUM' ? "bg-amber-100 text-amber-700 border-amber-200" :
                                    "bg-blue-100 text-blue-700 border-blue-200"
                        )}>
                            {activeDragEvent.title}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
