"use client";

import { Plus, Search, User, LayoutList, Kanban, Trash2, Filter } from "lucide-react";
import { WorkOrderKanban } from "@/components/work-orders/wo-kanban";
import { WOAssignDialog } from "@/components/work-orders/wo-assign-dialog";
import { cn } from "@/lib/utils";
import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkOrders } from "@/lib/work-orders-context";
import { WorkOrder } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { deleteWorkOrder } from "@/lib/actions";
import { TableSkeleton } from "@/components/ui/skeleton";

const WOPriorityBadge = ({ priority }: { priority: string }) => {
    let colorClass = "";
    let label = priority;
    switch (priority) {
        case "HIGH":
            colorClass = "bg-red-100 text-red-700 border-red-200";
            label = "ALTA";
            break;
        case "MEDIUM":
            colorClass = "bg-amber-100 text-amber-700 border-amber-200";
            label = "MEDIA";
            break;
        case "LOW":
            colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
            label = "BASSA";
            break;
        default:
            colorClass = "bg-slate-100 text-slate-700 border-slate-200";
            break;
    }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorClass}`}>{label}</span>;
};

const WOStatusBadge = ({ status }: { status: string }) => {
    let colorClass = "";
    let label = status;
    switch (status) {
        case "OPEN":
            colorClass = "bg-blue-50 text-blue-700 border-blue-200";
            label = "APERTO";
            break;
        case "IN_PROGRESS":
            colorClass = "bg-purple-50 text-purple-700 border-purple-200";
            label = "IN CORSO";
            break;
        case "COMPLETED":
            colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
            label = "COMPLETATO";
            break;
        case "PENDING_APPROVAL":
            colorClass = "bg-amber-50 text-amber-700 border-amber-200";
            label = "IN ATTESA";
            break;
        case "CLOSED":
            colorClass = "bg-gray-100 text-gray-600 border-gray-200";
            label = "CHIUSO";
            break;
        case "CANCELED":
            colorClass = "bg-red-50 text-red-700 border-red-200";
            label = "ANNULLATO"; // or IN ATTESA
            break;
        default:
            colorClass = "bg-gray-100 text-gray-800";
            break;
    }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorClass}`}>{label}</span>;
};

function WorkOrdersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { workOrders } = useWorkOrders();
    const { user } = useAuth();

    // Determine initial tab from URL or default to ACTIVE
    const tabParam = searchParams.get('tab');
    const initialTab = tabParam === 'requests' ? 'REQUESTS' :
        tabParam === 'history' ? 'HISTORY' : 'ACTIVE';

    const [filter, setFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [technicianFilter, setTechnicianFilter] = useState("ALL");
    const [onlyMyTasks, setOnlyMyTasks] = useState(false);
    const [view, setView] = useState<'LIST' | 'BOARD'>('LIST');
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'REQUESTS' | 'HISTORY'>(initialTab);

    const [assigningWo, setAssigningWo] = useState<{ id: string, techId?: string } | null>(null);
    const canManage = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

    // Extract unique technicians for the dropdown
    const uniqueTechnicians = useMemo(() => {
        const techs = new Set<string>();
        workOrders.forEach(wo => {
            if (wo.assignedTo && wo.assignedTo !== 'Unassigned') {
                techs.add(wo.assignedTo);
            }
        });
        return Array.from(techs).sort();
    }, [workOrders]);

    // Filter logic
    const filteredWOs = workOrders.filter(wo => {
        // Tab Filter
        if (activeTab === 'REQUESTS' && wo.status !== 'PENDING_APPROVAL') return false;
        if (activeTab === 'HISTORY' && (wo.status !== 'CLOSED' && wo.status !== 'CANCELED')) return false;
        if (activeTab === 'ACTIVE' && (wo.status === 'PENDING_APPROVAL' || wo.status === 'CLOSED' || wo.status === 'CANCELED')) return false;

        const matchesFilter = wo.title.toLowerCase().includes(filter.toLowerCase()) ||
            wo.description.toLowerCase().includes(filter.toLowerCase()) ||
            wo.assetName?.toLowerCase().includes(filter.toLowerCase()) ||
            wo.assignedTo.toLowerCase().includes(filter.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || wo.status === statusFilter;

        // Technician Filter
        const matchesTechnician = technicianFilter === "ALL" || wo.assignedTo === technicianFilter;

        // My Tasks Filter (Deprecated if Technician Filter is used, but kept for "Quick access")
        const matchesMine = onlyMyTasks
            ? (user ? (wo.assignedTechnicianId === user.id || wo.assignedTo === user.name) : false)
            : true;

        return matchesFilter && matchesStatus && matchesTechnician && matchesMine;
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Sei sicuro di voler eliminare questo ordine di lavoro? Questa azione non può essere annullata.")) return;

        try {
            const result = await deleteWorkOrder(id);
            if (result.success) {
                router.refresh();
            } else {
                alert("Errore durante l'eliminazione: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Si è verificato un errore.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Ordini di Lavoro
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestisci e monitora le richieste di manutenzione.</p>
                </div>
                <button
                    onClick={() => router.push('/work-orders/new')}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
                >
                    <Plus className="h-4 w-4" /> Nuovo Ordine
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-xl bg-muted p-1 w-full sm:w-auto">
                {['ACTIVE', 'REQUESTS', 'HISTORY'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            "flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-lg transition-all",
                            activeTab === tab
                                ? "bg-background text-foreground shadow-sm scale-[1.02]"
                                : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                        )}
                    >
                        {tab === 'ACTIVE' && 'Attivi'}
                        {tab === 'REQUESTS' && (
                            <span className="flex items-center gap-2">
                                Richieste
                                {workOrders.filter(w => w.status === 'PENDING_APPROVAL').length > 0 &&
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{workOrders.filter(w => w.status === 'PENDING_APPROVAL').length}</span>
                                }
                            </span>
                        )}
                        {tab === 'HISTORY' && 'Storico'}
                    </button>
                ))}
            </div>

            {/* Filters & View Toggle */}
            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
                <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        placeholder="Search..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <div className="flex items-center gap-2 border-r pr-4">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer text-muted-foreground font-medium"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                        >
                            <option value="ALL">Stato: Tutti</option>
                            <option value="OPEN">Aperti</option>
                            <option value="IN_PROGRESS">In Corso</option>
                            <option value="COMPLETED">Completati</option>
                        </select>
                    </div>

                    <select
                        className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer text-muted-foreground font-medium border-r pr-4"
                        value={technicianFilter}
                        onChange={(e) => setTechnicianFilter(e.target.value)}
                    >
                        <option value="ALL">Tecnico: Tutti</option>
                        {uniqueTechnicians.map(tech => (
                            <option key={tech} value={tech}>{tech}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setOnlyMyTasks(!onlyMyTasks)}
                        className={cn(
                            "text-sm font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
                            onlyMyTasks ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        Le Mie Attività
                    </button>
                </div>

                <div className="flex items-center bg-muted/50 rounded-lg p-1">
                    <button
                        onClick={() => setView('LIST')}
                        className={cn("p-1.5 rounded-md transition-all", view === 'LIST' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        <LayoutList className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setView('BOARD')}
                        className={cn("p-1.5 rounded-md transition-all", view === 'BOARD' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        <Kanban className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {view === 'LIST' ? (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 text-muted-foreground font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Task</th>
                                    <th className="px-6 py-4">Asset</th>
                                    <th className="px-6 py-4">Priorità</th>
                                    <th className="px-6 py-4">Stato</th>
                                    <th className="px-6 py-4">Assegnato a</th>
                                    <th className="px-6 py-4">Scadenza</th>
                                    {canManage && <th className="px-6 py-4 text-right">Azioni</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {filteredWOs.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                                                    <Search className="h-6 w-6 opacity-30" />
                                                </div>
                                                <p className="font-medium">Nessun ordine di lavoro trovato</p>
                                                <p className="text-xs max-w-xs text-center opacity-70">Prova a modificare i filtri o crea un nuovo ordine di lavoro.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredWOs.map((wo) => (
                                        <tr
                                            key={wo.id}
                                            onClick={() => router.push(`/work-orders/${wo.id}`)}
                                            className="group hover:bg-muted/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-medium">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="group-hover:text-primary transition-colors text-base">{wo.title}</span>
                                                        {wo.category === 'AI_SUGGESTION' && (
                                                            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                                                ✨ AI
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-mono text-muted-foreground opacity-70">{wo.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {wo.assetName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <WOPriorityBadge priority={wo.priority} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <WOStatusBadge status={wo.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div
                                                    className={cn(
                                                        "flex items-center gap-2 transition-colors rounded py-1 px-2 w-fit",
                                                        canManage ? "cursor-pointer hover:bg-muted/80 border border-transparent hover:border-border" : ""
                                                    )}
                                                    onClick={(e) => {
                                                        if (canManage) {
                                                            e.stopPropagation();
                                                            setAssigningWo({ id: wo.id, techId: wo.assignedTechnicianId });
                                                        }
                                                    }}
                                                    title={canManage ? "Clicca per assegnare" : undefined}
                                                >
                                                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold", (!wo.assignedTo || wo.assignedTo === 'Unassigned') ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                                                        {(!wo.assignedTo || wo.assignedTo === 'Unassigned') ? '?' : wo.assignedTo.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className={cn((!wo.assignedTo || wo.assignedTo === 'Unassigned') ? "text-amber-600 font-medium italic text-xs" : "text-sm")}>
                                                        {(!wo.assignedTo || wo.assignedTo === 'Unassigned') ? 'Assegna' : wo.assignedTo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                                                {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString("it-IT") : '-'}
                                            </td>
                                            {canManage && (
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => handleDelete(e, wo.id)}
                                                        className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <WorkOrderKanban workOrders={filteredWOs} />
            )}

            <WOAssignDialog
                workOrderId={assigningWo?.id || null}
                currentTechnicianId={assigningWo?.techId}
                onClose={() => setAssigningWo(null)}
            />
        </div>
    );
}

export default function WorkOrdersPage() {
    return (
        <Suspense fallback={<TableSkeleton rows={8} />}>
            <WorkOrdersContent />
        </Suspense>
    );
}
