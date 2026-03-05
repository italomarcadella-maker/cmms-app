"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, GripVertical, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type ActionItem = {
    id: string;
    description: string;
    status: string;
    assigneeName?: string;
    createdAt: string;
    section: {
        type: string;
        meeting: {
            department: string;
            date: string;
        }
    }
};

export function ActionItemsKanban() {
    const [items, setItems] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await fetch("/api/daily-meetings/action-items");
            const data = await res.json();
            if (Array.isArray(data)) {
                setItems(data);
            }
        } catch (e) {
            toast.error("Errore nel caricamento Kanaban");
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("itemId", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("itemId");
        if (!id) return;

        // Optimistic Update
        setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));

        try {
            await fetch("/api/daily-meetings/action-items", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus })
            });
            toast.success("Task aggiornato");
        } catch (err) {
            toast.error("Errore salvataggio status");
            fetchItems(); // revert
        }
    };

    const columns = [
        { id: "OPEN", title: "Da Iniziare", icon: AlertCircle, color: "text-rose-500", border: "border-rose-200", bg: "bg-rose-50/50" },
        { id: "IN_PROGRESS", title: "In Lavorazione", icon: Clock, color: "text-amber-500", border: "border-amber-200", bg: "bg-amber-50/50" },
        { id: "RESOLVED", title: "Completati", icon: CheckCircle2, color: "text-emerald-500", border: "border-emerald-200", bg: "bg-emerald-50/50" },
    ];

    if (loading) {
        return <div className="animate-pulse h-64 bg-muted rounded-xl"></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map(col => {
                const colItems = items.filter(i => i.status === col.id);
                const Icon = col.icon;

                return (
                    <div
                        key={col.id}
                        className={`rounded-xl border-2 ${col.border} ${col.bg} dark:bg-black/10 flex flex-col`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className="p-3 border-b flex items-center justify-between bg-white/50 dark:bg-black/20 rounded-t-lg">
                            <h3 className={`font-semibold text-sm flex items-center gap-2 ${col.color}`}>
                                <Icon className="h-4 w-4" /> {col.title}
                            </h3>
                            <Badge variant="secondary" className="rounded-full px-2">{colItems.length}</Badge>
                        </div>

                        <div className="p-3 flex-1 flex flex-col gap-3 min-h-[300px]">
                            {colItems.length === 0 && (
                                <div className="text-xs text-muted-foreground text-center py-8 italic opacity-50">
                                    Nessun task in questa colonna
                                </div>
                            )}
                            {colItems.map(item => (
                                <Card
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    className="cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group border-l-4 border-l-indigo-400"
                                >
                                    <CardContent className="p-3 relative">
                                        <GripVertical className="h-4 w-4 text-muted-foreground/30 absolute right-2 top-3 group-hover:text-muted-foreground/80" />

                                        <div className="flex gap-2 mb-2 pr-6">
                                            <Badge variant="outline" className="text-[9px] px-1 h-4">
                                                {item.section?.type || 'GENERIC'}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[9px] px-1 h-4 bg-muted">
                                                {item.section?.meeting?.department || 'N/D'}
                                            </Badge>
                                        </div>

                                        <p className="text-sm font-medium leading-snug mb-3">
                                            {item.description}
                                        </p>

                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span className="truncate max-w-[120px]">
                                                {item.assigneeName ? `👤 ${item.assigneeName}` : 'In attesa'}
                                            </span>
                                            <span>
                                                {new Date(item.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
