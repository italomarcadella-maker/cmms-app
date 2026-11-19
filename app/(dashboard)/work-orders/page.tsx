"use client";

import { Plus, Search, LayoutList, Kanban, Trash2, X } from "lucide-react";
import { PlantBadge } from "@/components/ui/plant-badge";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { WorkOrderKanban } from "@/components/work-orders/wo-kanban";
import { WOAssignDialog } from "@/components/work-orders/wo-assign-dialog";
import { cn } from "@/lib/utils";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAuth } from "@/lib/auth-context";
import { deleteWorkOrder } from "@/lib/actions";
import { getCurrentTechnicianId } from "@/modules/maintenance/adapters/actions/mobile-actions";
import { SUPERVISION, hasRole } from "@/lib/roles";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PriorityPill, WorkOrderStatusPill } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/skeleton";

type TabId = "ACTIVE" | "REQUESTS" | "HISTORY";

const isUnassigned = (assignedTo?: string | null) => !assignedTo || assignedTo === "Unassigned";

function Assignee({ assignedTo }: { assignedTo?: string | null }) {
    const none = isUnassigned(assignedTo);
    return (
        <>
            <span
                className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                    none ? "bg-warning-soft text-warning-strong" : "bg-info-soft text-info-strong"
                )}
            >
                {none ? "?" : assignedTo!.substring(0, 2).toUpperCase()}
            </span>
            <span className={cn("text-sm", none && "font-medium text-warning-strong")}>{none ? "Da assegnare" : assignedTo}</span>
        </>
    );
}

function WorkOrdersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { workOrders } = useWorkOrders();
    const { user } = useAuth();
    const { confirm, dialog: confirmDialog } = useConfirm();

    // Initial tab from the URL (the sidebar links to ?tab=requests)
    const tabParam = searchParams.get("tab");
    const initialTab: TabId = tabParam === "requests" ? "REQUESTS" : tabParam === "history" ? "HISTORY" : "ACTIVE";

    // Filters coming from dashboard links
    const categoryParam = searchParams.get("category");
    const locationParam = searchParams.get("location");
    const assetTypeParam = searchParams.get("assetType");
    const hasLineParam = searchParams.get("hasLine");

    const [filter, setFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [technicianFilter, setTechnicianFilter] = useState("ALL");
    const [onlyMyTasks, setOnlyMyTasks] = useState(false);
    const [view, setView] = useState<"LIST" | "BOARD">("LIST");
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);

    const [assigningWo, setAssigningWo] = useState<{ id: string; techId?: string } | null>(null);
    const canManage = user?.role === "ADMIN" || user?.role === "SUPERVISOR" || user?.role === "PLANT_MANAGER" || user?.role === "MAINTAINER";
    // Assegnare a un tecnico e' un compito di chi coordina: il manutentore puo' solo prendere in carico (vedi il Kanban e la scheda mobile)
    const canAssign = hasRole(user?.role, SUPERVISION);

    // L'id del tecnico non e' l'id dell'utente: gli ordini portano l'id del profilo tecnico, che si chiede al server
    const [myTechId, setMyTechId] = useState<string | null>(null);
    useEffect(() => {
        let alive = true;
        getCurrentTechnicianId().then(id => { if (alive) setMyTechId(id); }).catch(() => { });
        return () => { alive = false; };
    }, [user?.id]);

    const pendingCount = workOrders.filter((w) => w.status === "PENDING_APPROVAL").length;

    const uniqueTechnicians = useMemo(() => {
        const techs = new Set<string>();
        workOrders.forEach((wo) => {
            if (wo.assignedTo && wo.assignedTo !== "Unassigned") techs.add(wo.assignedTo);
        });
        return Array.from(techs).sort();
    }, [workOrders]);

    const urlFilters = [
        categoryParam && `Categoria: ${categoryParam}`,
        locationParam && `Ubicazione: ${locationParam}`,
        assetTypeParam && `Tipo asset: ${assetTypeParam}`,
        hasLineParam === "true" && "Solo linee produttive",
    ].filter(Boolean) as string[];

    const filteredWOs = workOrders.filter((wo) => {
        if (activeTab === "REQUESTS" && wo.status !== "PENDING_APPROVAL") return false;
        if (activeTab === "HISTORY" && wo.status !== "CLOSED" && wo.status !== "CANCELED") return false;
        if (activeTab === "ACTIVE" && (wo.status === "PENDING_APPROVAL" || wo.status === "CLOSED" || wo.status === "CANCELED")) return false;

        const q = filter.toLowerCase();
        const matchesFilter =
            wo.title.toLowerCase().includes(q) ||
            wo.description.toLowerCase().includes(q) ||
            wo.assetName?.toLowerCase().includes(q) ||
            wo.assignedTo.toLowerCase().includes(q);

        const matchesStatus = statusFilter === "ALL" || wo.status === statusFilter;
        const matchesTechnician = technicianFilter === "ALL" || wo.assignedTo === technicianFilter;
        const matchesMine = onlyMyTasks ? (!!myTechId && (wo.assignedTechnicianId === myTechId || (wo.technicians ?? []).some((t: { id: string }) => t.id === myTechId))) : true;

        if (categoryParam && wo.category !== categoryParam) return false;
        if (locationParam && wo.asset?.location && !wo.asset.location.toLowerCase().includes(locationParam.toLowerCase())) return false;
        if (locationParam && !wo.asset?.location) return false;
        if (assetTypeParam && wo.asset?.type !== assetTypeParam) return false;
        if (hasLineParam === "true" && !wo.asset?.line) return false;

        return matchesFilter && matchesStatus && matchesTechnician && matchesMine;
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const ok = await confirm({
            title: "Eliminare questo ordine di lavoro?",
            description: "L'azione non può essere annullata.",
            confirmLabel: "Elimina",
            variant: "destructive",
        });
        if (!ok) return;

        try {
            const result = await deleteWorkOrder(id);
            if (result.success) {
                toast.success("Ordine di lavoro eliminato");
                router.refresh();
            } else {
                toast.error("Impossibile eliminare l'ordine", { description: result.message });
            }
        } catch (error) {
            console.error(error);
            toast.error("Si è verificato un errore durante l'eliminazione");
        }
    };

    const empty = (
        <EmptyState
            icon={<Search />}
            title="Nessun ordine di lavoro trovato"
            description="Prova a modificare i filtri oppure crea un nuovo ordine di lavoro."
            action={
                <Button size="sm" onClick={() => router.push("/work-orders/new")}>
                    <Plus className="mr-1.5 h-4 w-4" /> Nuovo ordine
                </Button>
            }
        />
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Ordini di lavoro"
                description="Gestisci e monitora le richieste di manutenzione."
                breadcrumb={[{ label: "Operativo" }, { label: "Ordini di lavoro" }]}
                actions={
                    <Button onClick={() => router.push("/work-orders/new")}>
                        <Plus className="mr-1.5 h-4 w-4" /> Nuovo ordine
                    </Button>
                }
                className="mb-2"
            />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
                <TabsList>
                    <TabsTrigger value="ACTIVE">Attivi</TabsTrigger>
                    <TabsTrigger value="REQUESTS" className="gap-2">
                        Richieste
                        {pendingCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1.5 text-[11px] font-semibold text-critical-foreground">
                                {pendingCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="HISTORY">Storico</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="h-9 pl-9"
                        placeholder="Cerca per titolo, asset o tecnico"
                        aria-label="Cerca ordini di lavoro"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 w-[150px]" aria-label="Filtra per stato">
                            <SelectValue placeholder="Stato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tutti gli stati</SelectItem>
                            <SelectItem value="OPEN">Aperti</SelectItem>
                            <SelectItem value="ASSIGNED">Assegnati</SelectItem>
                            <SelectItem value="IN_PROGRESS">In corso</SelectItem>
                            <SelectItem value="ON_HOLD">In attesa</SelectItem>
                            <SelectItem value="COMPLETED">Completati</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                        <SelectTrigger className="h-9 w-[170px]" aria-label="Filtra per tecnico">
                            <SelectValue placeholder="Tecnico" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tutti i tecnici</SelectItem>
                            {uniqueTechnicians.map((tech) => (
                                <SelectItem key={tech} value={tech}>
                                    {tech}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        type="button"
                        variant={onlyMyTasks ? "default" : "outline"}
                        size="sm"
                        aria-pressed={onlyMyTasks}
                        onClick={() => setOnlyMyTasks(!onlyMyTasks)}
                    >
                        Le mie attività
                    </Button>
                </div>

                <SegmentedControl
                    aria-label="Vista"
                    value={view}
                    onChange={setView}
                    options={[
                        { value: "LIST", label: "Lista", icon: <LayoutList /> },
                        { value: "BOARD", label: "Kanban", icon: <Kanban /> },
                    ]}
                />
            </div>

            {urlFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Filtri attivi:</span>
                    {urlFilters.map((f) => (
                        <Badge key={f} variant="info">
                            {f}
                        </Badge>
                    ))}
                    <Button variant="ghost" size="xs" onClick={() => router.push("/work-orders")}>
                        <X className="mr-1 h-3.5 w-3.5" /> Rimuovi filtri
                    </Button>
                </div>
            )}

            {view === "LIST" ? (
                <>
                    {/* Desktop table */}
                    <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Ordine</TableHead>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Priorità</TableHead>
                                    <TableHead>Stato</TableHead>
                                    <TableHead>Assegnato a</TableHead>
                                    <TableHead>Scadenza</TableHead>
                                    {canManage && <TableHead className="w-12 text-right">
                                        <span className="sr-only">Azioni</span>
                                    </TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredWOs.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={canManage ? 7 : 6}>{empty}</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredWOs.map((wo) => (
                                        <TableRow key={wo.id} onClick={() => router.push(`/work-orders/${wo.id}`)} className="group cursor-pointer">
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium group-hover:text-primary">{wo.title}</span>
                                                        {wo.category === "AI_SUGGESTION" && <Badge variant="info">Suggerito dall&apos;AI</Badge>}
                                                        <PlantBadge plantId={wo.plantId} />
                                                    </div>
                                                    <span className="font-mono text-xs text-muted-foreground">{wo.id.substring(0, 10)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{wo.assetName}</TableCell>
                                            <TableCell>
                                                <PriorityPill priority={wo.priority} />
                                            </TableCell>
                                            <TableCell>
                                                <WorkOrderStatusPill status={wo.status} />
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className={cn(
                                                        "flex w-fit items-center gap-2 rounded-md px-1.5 py-1",
                                                        canAssign && "cursor-pointer hover:bg-accent"
                                                    )}
                                                    onClick={(e) => {
                                                        if (canAssign) {
                                                            e.stopPropagation();
                                                            setAssigningWo({ id: wo.id, techId: wo.assignedTechnicianId });
                                                        }
                                                    }}
                                                    title={canAssign ? "Clicca per assegnare" : undefined}
                                                >
                                                    <Assignee assignedTo={wo.assignedTo} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                                                {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString("it-IT") : "-"}
                                            </TableCell>
                                            {canManage && (
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground opacity-0 hover:text-critical-strong focus-visible:opacity-100 group-hover:opacity-100"
                                                        onClick={(e) => handleDelete(e, wo.id)}
                                                        aria-label={`Elimina ${wo.title}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {filteredWOs.length === 0 ? (
                            <div className="rounded-xl border bg-card">{empty}</div>
                        ) : (
                            filteredWOs.map((wo) => (
                                <div
                                    key={wo.id}
                                    onClick={() => router.push(`/work-orders/${wo.id}`)}
                                    className="cursor-pointer space-y-3 rounded-xl border bg-card p-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 font-semibold">{wo.title}</p>
                                            <p className="text-xs text-muted-foreground">{wo.assetName}</p>
                                            <PlantBadge plantId={wo.plantId} className="mt-1" />
                                        </div>
                                        <WorkOrderStatusPill status={wo.status} />
                                    </div>
                                    <PriorityPill priority={wo.priority} />
                                    <div className="flex items-center justify-between border-t pt-3">
                                        <div className="flex items-center gap-2">
                                            <Assignee assignedTo={wo.assignedTo} />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : ""}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <WorkOrderKanban workOrders={filteredWOs} />
            )}

            <WOAssignDialog
                workOrderId={assigningWo?.id || null}
                currentTechnicianId={assigningWo?.techId}
                onClose={() => setAssigningWo(null)}
            />
            {confirmDialog}
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
