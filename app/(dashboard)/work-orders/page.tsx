"use client";

import { Plus, Search, User, LayoutList, Kanban, Trash2 } from "lucide-react";
import { WorkOrderKanban } from "@/components/work-orders/wo-kanban";
import { WOAssignDialog } from "@/components/work-orders/wo-assign-dialog";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWorkOrders } from "@/lib/work-orders-context";
import { WorkOrder } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { deleteWorkOrder } from "@/lib/actions";

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
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colorClass}`}>{label}</span>;
};

const WOStatusBadge = ({ status }: { status: string }) => {
    let colorClass = "";
    let label = status;
    switch (status) {
        case "OPEN":
            colorClass = "bg-blue-100 text-blue-700 border-blue-200";
            label = "APERTO";
            break;
        case "IN_PROGRESS":
            colorClass = "bg-purple-100 text-purple-700 border-purple-200";
            label = "IN CORSO";
            break;
        case "COMPLETED":
            colorClass = "bg-green-100 text-green-700 border-green-200";
            label = "COMPLETATO";
            break;
        case "ON_HOLD":
        case "CANCELED":
            colorClass = "bg-slate-100 text-slate-600 border-slate-200";
            label = "ANNULLATO"; // or IN ATTESA
            break;
        default:
            colorClass = "bg-gray-100 text-gray-800";
            break;
    }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colorClass}`}>{label}</span>;
};

export default function WorkOrdersPage() {
    const router = useRouter();
    const { workOrders } = useWorkOrders();
    const { user } = useAuth();
    const [filter, setFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [technicianFilter, setTechnicianFilter] = useState("ALL"); // New Technician Filter
    const [onlyMyTasks, setOnlyMyTasks] = useState(false);
    const [view, setView] = useState<'LIST' | 'BOARD'>('LIST');

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
                // Success - Context or RevalidatePath will handle refresh, but we might want to manually refresh router
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
                    onClick={() => router.push('/work-orders/new')} // Assuming a 'new' creation page or we'll add one later, but for now linking to create action
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                    <Plus className="h-4 w-4" /> Nuovo Ordine
                </button>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-4 flex-1 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cerca ordini di lavoro..."
                            className="pl-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="ALL">Tutti gli Stati</option>
                        <option value="OPEN">Aperti</option>
                        <option value="IN_PROGRESS">In Corso</option>
                        <option value="COMPLETED">Completati</option>
                    </select>

                    {/* Technician Filter */}
                    <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={technicianFilter}
                        onChange={(e) => setTechnicianFilter(e.target.value)}
                    >
                        <option value="ALL">Tutti i Tecnici</option>
                        {uniqueTechnicians.map(tech => (
                            <option key={tech} value={tech}>{tech}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setOnlyMyTasks(!onlyMyTasks)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${onlyMyTasks ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-muted'}`}
                    >
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Le Mie Attività</span>
                    </button>
                </div>

                <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
                    <button
                        onClick={() => setView('LIST')}
                        className={`p-2 hover:bg-muted/50 transition-colors ${view === 'LIST' ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
                        title="Start List View"
                    >
                        <LayoutList className="h-4 w-4" />
                    </button>
                    <div className="w-px h-full bg-border" />
                    <button
                        onClick={() => setView('BOARD')}
                        className={`p-2 hover:bg-muted/50 transition-colors ${view === 'BOARD' ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
                        title="Start Kanban View"
                    >
                        <Kanban className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {view === 'LIST' ? (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                <tr>
                                    <th className="px-4 py-3">Task</th>
                                    <th className="px-4 py-3">Asset</th>
                                    <th className="px-4 py-3">Priorità</th>
                                    <th className="px-4 py-3">Stato</th>
                                    <th className="px-4 py-3">Assegnato a</th>
                                    <th className="px-4 py-3">Scadenza</th>
                                    {canManage && <th className="px-4 py-3 text-right">Azioni</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredWOs.length === 0 ? (
                                    <tr>
                                        <td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground italic">
                                            Nessun ordine di lavoro trovato.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredWOs.map((wo) => (
                                        <tr
                                            key={wo.id}
                                            onClick={() => router.push(`/work-orders/${wo.id}`)}
                                            className="group hover:bg-muted/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border group-hover:bg-background transition-colors">
                                                        {wo.id}
                                                    </span>
                                                    <span className="group-hover:text-primary transition-colors">{wo.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground flex items-center gap-1.5 h-full">
                                                <div className="flex items-center gap-1.5 mt-2.5">
                                                    {wo.assetName}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <WOPriorityBadge priority={wo.priority} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <WOStatusBadge status={wo.status} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div
                                                    className={cn(
                                                        "flex items-center gap-1.5 transition-colors rounded p-1",
                                                        canManage ? "cursor-pointer hover:bg-muted font-medium hover:text-primary" : "text-muted-foreground"
                                                    )}
                                                    onClick={(e) => {
                                                        if (canManage) {
                                                            e.stopPropagation();
                                                            setAssigningWo({ id: wo.id, techId: wo.assignedTechnicianId });
                                                        }
                                                    }}
                                                    title={canManage ? "Clicca per assegnare" : undefined}
                                                >
                                                    <User className={cn("h-3 w-3", wo.assignedTo === 'Unassigned' ? "text-amber-500" : "")} />
                                                    <span className={cn(wo.assignedTo === 'Unassigned' ? "text-amber-600 font-medium" : "")}>
                                                        {wo.assignedTo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-muted-foreground">
                                                {wo.dueDate}
                                            </td>
                                            {canManage && (
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={(e) => handleDelete(e, wo.id)}
                                                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 rounded-lg transition-colors"
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

