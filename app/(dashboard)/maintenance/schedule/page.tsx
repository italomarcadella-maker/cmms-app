"use client";

import { usePM } from "@/lib/pm-context";
import { useAssets } from "@/lib/assets-context";
import { useWorkOrders } from "@/lib/work-orders-context"; // Import WorkOrders
import { format, differenceInDays, parseISO } from "date-fns";
import { Calendar, CheckCircle2, AlertTriangle, Plus, Box, RefreshCw, Trash2, StopCircle, PlayCircle, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation"; // Added router

import { useState } from "react";

import { CreateScheduleDialog } from "@/components/maintenance/create-schedule-dialog";
import { Button } from "@/components/ui/button";

export default function PMSchedulePage() {
    const { schedules, generateDueWorkOrders, deleteSchedule } = usePM(); // pm-context might need refresh logic eventually
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();
    const { user } = useAuth();
    const router = useRouter();

    const activeWOs = workOrders.filter(wo => wo.status === 'OPEN' || wo.status === 'IN_PROGRESS');

    const isAdmin = user?.role === 'ADMIN';
    const [generatedCount, setGeneratedCount] = useState<number | null>(null);

    const handleGenerate = () => {
        const count = generateDueWorkOrders();
        setGeneratedCount(count);
        setTimeout(() => setGeneratedCount(null), 3000);
    };

    const getStatusColor = (dueDate: string, isWO: boolean = false) => {
        if (!dueDate) return { bg: "bg-gray-100", text: "text-gray-700", label: "No Date" };
        const days = differenceInDays(new Date(dueDate), new Date());

        if (days < 0) return { bg: "bg-red-100", text: "text-red-700", label: "Scaduto" };
        if (days <= 2) return { bg: "bg-amber-100", text: "text-amber-700", label: "Urgente" };

        if (isWO) return { bg: "bg-blue-100", text: "text-blue-700", label: "Attivo" };
        return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Pianificato" };
    };

    // Unified List Type
    type UnifiedItem = {
        type: 'PM' | 'WO',
        id: string,
        title: string,
        assetName: string,
        description: string,
        date: string,
        status: string;
        frequency?: string;
        original: any
    };

    const unifiedList: UnifiedItem[] = [
        ...activeWOs.map(wo => ({
            type: 'WO' as const,
            id: wo.id,
            title: wo.title,
            assetName: wo.assetName,
            description: wo.description,
            date: wo.dueDate || '',
            status: wo.status,
            original: wo
        })),
        ...schedules.map(sch => {
            const asset = assets.find(a => a.id === sch.assetId);
            return {
                type: 'PM' as const,
                id: sch.id,
                title: sch.taskTitle,
                assetName: asset?.name || sch.assetName,
                description: sch.description,
                date: sch.nextDueDate,
                status: 'SCHEDULED',
                frequency: sch.frequency,
                original: sch
            };
        })
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Calendario Attività
                    </h1>
                    <p className="text-muted-foreground mt-1">Vista unificata: Schedulazioni Preventive e Ordini di Lavoro Attivi.</p>
                </div>
                <div className="flex gap-2">
                    {/* Keep generate button for manual triggering */}
                    <Button
                        onClick={handleGenerate}
                        variant="secondary" // User said they are different. Let's keep one secondary one primary but ensure same component structure.
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" /> Check Scadenze
                    </Button>
                    {isAdmin && <CreateScheduleDialog />}
                </div>
            </div>

            {generatedCount !== null && (
                <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Generati con successo {generatedCount} nuovi ordini di lavoro.</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unifiedList.map(item => {
                    const statusInfo = getStatusColor(item.date, item.type === 'WO');

                    return (
                        <div
                            key={`${item.type}-${item.id}`}
                            className={`rounded-xl border p-6 shadow-sm hover:shadow-md transition-all group relative ${item.type === 'WO' ? 'bg-blue-50/30 border-blue-100' : 'bg-card'}`}
                            onClick={() => item.type === 'WO' && router.push(`/work-orders/${item.id}`)}
                            style={{ cursor: item.type === 'WO' ? 'pointer' : 'default' }}
                        >
                            {/* Type Badge */}
                            <div className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${item.type === 'WO' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {item.type === 'WO' ? 'ORDINE ATTIVO' : (item.frequency || 'PREVENTIVA')}
                            </div>

                            <div className="flex justify-between items-start mb-4 pr-16"> {/* pr-16 for badge space */}
                                <div>
                                    <h3 className={`font-semibold text-lg line-clamp-1 ${item.type === 'WO' ? 'text-blue-900' : ''}`}>{item.title}</h3>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                        <Box className="h-3 w-3" />
                                        <span>{item.assetName}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                                {item.description}
                            </p>

                            <div className="space-y-2 pt-4 border-t text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Stato:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Data Target:
                                    </span>
                                    <span className={`font-mono font-medium ${statusInfo.text}`}>
                                        {new Date(item.date).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Action for PM only */}
                                {item.type === 'PM' && isAdmin && (
                                    <div className="flex justify-end mt-2 pt-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Sei sicuro di voler eliminare questa schedulazione?")) {
                                                    deleteSchedule(item.id);
                                                }
                                            }}
                                            className="text-muted-foreground hover:text-red-600 transition-colors p-1 flex items-center gap-1 text-xs"
                                        >
                                            <Trash2 className="h-3 w-3" /> Elimina
                                        </button>
                                    </div>
                                )}

                                {item.type === 'WO' && (
                                    <div className="flex justify-end mt-2 pt-2 gap-2">
                                        {isAdmin && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Sei sicuro di voler eliminare questo ordine di lavoro?")) {
                                                        const { deleteWorkOrder } = await import('@/lib/actions');
                                                        await deleteWorkOrder(item.id);
                                                    }
                                                }}
                                                className="text-muted-foreground hover:text-red-600 transition-colors p-1 flex items-center gap-1 text-xs"
                                                title="Elimina Ordine"
                                            >
                                                <Trash2 className="h-3 w-3" /> Elimina
                                            </button>
                                        )}
                                        <div className="text-blue-600 text-xs font-medium group-hover:underline flex items-center ml-auto">
                                            Vedi Dettagli →
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {unifiedList.length === 0 && (

                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>Nessuna schedulazione definita.</p>
                        {isAdmin && <div className="mt-4"><CreateScheduleDialog /></div>}
                    </div>
                )}
            </div>
        </div>
    );
}
