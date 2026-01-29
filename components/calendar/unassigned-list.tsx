"use client";

import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Clock, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnassignedEvent {
    id: string;
    title: string;
    priority?: string;
    type?: string;
    assignedTo?: string;
}

interface UnassignedListProps {
    events: UnassignedEvent[];
}

function DraggableSidebarItem({ event }: { event: UnassignedEvent }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: event.id,
        data: event
    });

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'HIGH': return "border-l-red-500 bg-red-50/50 hover:bg-red-50";
            case 'MEDIUM': return "border-l-amber-500 bg-amber-50/50 hover:bg-amber-50";
            case 'LOW': return "border-l-emerald-500 bg-emerald-50/50 hover:bg-emerald-50";
            default: return "border-l-blue-500 bg-blue-50/50 hover:bg-blue-50";
        }
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "p-3 rounded-md border text-sm shadow-sm cursor-grab active:cursor-grabbing border-l-4 transition-all hover:translate-x-1",
                getPriorityColor(event.priority),
                isDragging && "opacity-30"
            )}
        >
            <div className="font-medium truncate mb-1">{event.title}</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    {event.type === 'WO' ? <Hammer className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {event.id.substring(0, 8)}...
                </span>
                {event.priority === 'HIGH' && <AlertTriangle className="h-3 w-3 text-red-500" />}
            </div>
        </div>
    );
}

export function UnassignedList({ events }: UnassignedListProps) {
    return (
        <div className="h-full flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20">
                <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Da Pianificare
                    <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                        {events.length}
                    </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Trascina nel calendario</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {events.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-4 border border-dashed rounded-lg">
                        <Clock className="h-8 w-8 mb-2 opacity-20" />
                        Nessun ordine in attesa
                    </div>
                ) : (
                    events.map(event => (
                        <DraggableSidebarItem key={event.id} event={event} />
                    ))
                )}
            </div>
        </div>
    );
}
