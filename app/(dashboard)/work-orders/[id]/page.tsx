"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useInventory } from "@/lib/inventory-context";
import { useReference } from "@/lib/reference-context";
import {
    ArrowLeft,
    Calendar,
    User,
    CheckCircle2,
    Clock,
    Wrench,
    Box,
    AlertTriangle,
    Banknote
} from "lucide-react";
import Link from "next/link";
import { WOAssignDialog } from "@/components/work-orders/wo-assign-dialog";
import { WOApproveDialog } from "@/components/work-orders/wo-approve-dialog";
import { updateWorkOrderStatus, reviewWorkOrder } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { WOPriorityBadge } from "@/components/work-orders/wo-priority-badge";
import { WOStatusBadge } from "@/components/work-orders/wo-status-badge";
import { WorkOrderChecklist } from "@/components/work-orders/wo-checklist";

export default function WorkOrderDetailPage() {
    const params = useParams();
    const router = useRouter(); // Use App Router
    const { user } = useAuth();
    const { workOrders, updateWorkOrder } = useWorkOrders();
    const { parts, updateQuantity } = useInventory();
    const { technicians } = useReference();

    const canManage = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

    // Parts State
    const [isAddingPart, setIsAddingPart] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState("");
    const [partQty, setPartQty] = useState(1);

    // Labor State
    const [isAddingLabor, setIsAddingLabor] = useState(false);
    const [selectedTechId, setSelectedTechId] = useState("");
    const [laborHours, setLaborHours] = useState(1);

    // Dialog State
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const wo = workOrders.find(w => w.id === params.id) || workOrders.find(w => w.id === decodeURIComponent(params.id as string));

    if (!wo) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-xl font-semibold">Ordine di Lavoro Non Trovato</h2>
                <Link href="/work-orders" className="text-primary hover:underline mt-4 flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Torna alla Lista</Link>
            </div>
        );
    }

    // Calculate Costs
    const partsCost = wo.partsUsed?.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) || 0;

    // We need to look up technicians to get rates if not stored on the log. 
    // In a real app, we might store the snapshot of rate at logging time.
    // For now, we'll look up live.
    const laborCost = (wo.laborLogs || []).reduce((sum, log) => {
        const tech = technicians.find(t => t.id === log.technicianId);
        // Debug
        // console.log("Log:", log, "Tech:", tech, "Rate:", tech?.hourlyRate);
        const rate = tech?.hourlyRate || 0;
        return sum + (log.hours * rate);
    }, 0);

    const totalCost = partsCost + laborCost;

    const handleAddPart = (e: React.FormEvent) => {
        e.preventDefault();
        const part = parts.find(p => p.id === selectedPartId);
        if (!part) return;

        if (part.quantity < partQty) {
            alert("Insufficient quantity in inventory!");
            return;
        }

        // 1. Update Inventory
        updateQuantity(part.id, part.quantity - partQty);

        // 2. Update Work Order
        const newPartUsage = {
            partId: part.id,
            partName: part.name,
            quantity: partQty,
            unitCost: part.unitCost || 0,
            dateAdded: new Date().toISOString()
        };

        const currentParts = wo.partsUsed || [];
        updateWorkOrder(wo.id, { partsUsed: [...currentParts, newPartUsage] });

        // Reset UI
        setIsAddingPart(false);
        setSelectedPartId("");
        setPartQty(1);
    };

    const handleAddLabor = (e: React.FormEvent) => {
        e.preventDefault();
        const tech = technicians.find(t => t.id === selectedTechId);
        if (!tech) return;

        const newLog = {
            id: `LOG-${Date.now()}`,
            technicianId: tech.id,
            technicianName: tech.name,
            hours: laborHours,
            date: new Date().toISOString()
        };

        const currentLogs = wo.laborLogs || [];
        updateWorkOrder(wo.id, { laborLogs: [...currentLogs, newLog] });

        setIsAddingLabor(false);
        setSelectedTechId("");
        setLaborHours(1);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/work-orders" className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Dettaglio Ordine di Lavoro
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <span className="font-mono bg-muted px-2 rounded text-sm">{wo.id}</span>
                        <span>•</span>
                        <span>Creato il {new Date(wo.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Main Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Status & Priority Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Stato</p>
                                <WOStatusBadge status={wo.status} />
                            </div>
                            {/* ... icon ... */}
                        </div>
                        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Priorità</p>
                                <WOPriorityBadge priority={wo.priority} />
                            </div>
                            {/* ... icon ... */}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Descrizione</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {wo.description}
                        </p>
                        <div className="mt-4 pt-4 border-t flex gap-6 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">Asset</span>
                                <Link href={`/assets/${wo.assetId}`} className="font-medium hover:underline text-primary flex items-center gap-1">
                                    <Box className="h-3 w-3" /> {wo.assetName}
                                </Link>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Assegnato a</span>
                                <div className="font-medium flex items-center gap-1">
                                    <User className="h-3 w-3" /> {wo.assignedTo}
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Scadenza</span>
                                <div className="font-medium flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {wo.dueDate}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Checklist */}
                    <WorkOrderChecklist workOrderId={wo.id} items={wo.checklist} onUpdate={updateWorkOrder} />

                </div>

                {/* Right Column: Actions & Costs */}
                <div className="space-y-6">

                    {/* Quick Actions (Placeholder) */}
                    {/* Actions Workflow */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Azioni Flusso</h3>
                        <div className="space-y-3">

                            {/* APPROVAL STEP */}
                            {wo.status === 'PENDING_APPROVAL' && (canManage ? (
                                <>
                                    <button
                                        onClick={() => setShowApproveDialog(true)}
                                        className="w-full text-left px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 shadow-sm"
                                    >
                                        <div className="p-1.5 bg-emerald-200/50 rounded-full">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="block font-semibold">Approva Richiesta</span>
                                            <span className="text-xs opacity-80">Assegna tecnico e avvia ordine</span>
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <div className="p-3 bg-muted/50 rounded-lg border text-sm text-center text-muted-foreground">
                                    In attesa di approvazione da un supervisore.
                                </div>
                            ))}

                            {/* EXECUTION STEP */}
                            {(wo.status === 'OPEN' || wo.status === 'IN_PROGRESS') && (
                                <button
                                    onClick={async () => {
                                        if (!confirm("Confermi di aver completato tutte le attività?")) return;
                                        await updateWorkOrderStatus(wo.id, 'PENDING_REVIEW'); // Use action or context
                                        // Context update might be faster for UI default
                                        updateWorkOrder(wo.id, { status: 'PENDING_REVIEW' });
                                        router.refresh();
                                    }}
                                    className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 shadow-sm"
                                >
                                    <div className="p-1.5 bg-blue-200/50 rounded-full">
                                        <Wrench className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <span className="block font-semibold">Segna come Completato</span>
                                        <span className="text-xs opacity-80">Invia per validazione finale</span>
                                    </div>
                                </button>
                            )}

                            {/* VALIDATION STEP */}
                            {wo.status === 'PENDING_REVIEW' && (canManage ? (
                                <>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("Confermi la validazione e chiusura dell'ordine?")) return;
                                            await reviewWorkOrder(wo.id, 'APPROVE');
                                        }}
                                        className="w-full text-left px-4 py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 shadow-sm"
                                    >
                                        <div className="p-1.5 bg-purple-200/50 rounded-full">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="block font-semibold">Valida e Chiudi</span>
                                            <span className="text-xs opacity-80">Archivia nello storico</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("Rifiutare il lavoro e rimandare al tecnico?")) return;
                                            await reviewWorkOrder(wo.id, 'REJECT');
                                        }}
                                        className="w-full text-left px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 shadow-sm"
                                    >
                                        <div className="p-1.5 bg-red-200/50 rounded-full">
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="block font-semibold">Rifiuta Lavoro</span>
                                            <span className="text-xs opacity-80">Torna allo stato 'In Corso'</span>
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <div className="p-3 bg-muted/50 rounded-lg border text-sm text-center text-muted-foreground">
                                    In attesa di validazione finale.
                                </div>
                            ))}

                            {wo.status === 'CLOSED' && (
                                <div className="p-4 bg-gray-50 rounded-lg border flex items-center justify-center gap-2 text-gray-600 font-medium">
                                    <CheckCircle2 className="h-5 w-5 text-gray-400" />
                                    Ordine Chiuso e Archiviato
                                </div>
                            )}

                            {/* Tech Assignment (Only for Open/InProgress) */}
                            {canManage && (wo.status === 'OPEN' || wo.status === 'IN_PROGRESS') && (
                                <button
                                    onClick={() => setAssigning(true)}
                                    className="w-full text-left px-4 py-2 hover:bg-muted rounded text-sm font-medium transition-colors flex items-center gap-2 text-muted-foreground mt-2"
                                >
                                    <User className="h-4 w-4" /> Riassegna Tecnico
                                </button>
                            )}

                            {/* Cancel Action (Available unless closed) */}
                            {wo.status !== 'CLOSED' && wo.status !== 'CANCELED' && canManage && (
                                <button className="w-full text-left px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded text-sm font-medium transition-colors flex items-center gap-2 text-muted-foreground mt-1">
                                    <AlertTriangle className="h-4 w-4" /> Annulla Ordine
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Job Costing Widget */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Banknote className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-semibold text-lg">Materiali & Costi</h3>
                        </div>

                        {/* Parts Usage Section */}
                        <div className="mb-6 border-b pb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Box className="h-4 w-4" /> Materiali Utilizzati
                                </h4>
                                <button
                                    onClick={() => setIsAddingPart(!isAddingPart)}
                                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
                                >
                                    + Aggiungi
                                </button>
                            </div>

                            {isAddingPart && (
                                <form onSubmit={handleAddPart} className="bg-muted/30 p-3 rounded-lg space-y-3 mb-3 animate-in fade-in zoom-in-95">
                                    <div>
                                        <select
                                            required
                                            className="w-full text-sm rounded-md border bg-background px-3 py-2"
                                            value={selectedPartId}
                                            onChange={e => setSelectedPartId(e.target.value)}
                                        >
                                            <option value="">Seleziona Ricambio...</option>
                                            {parts.map(p => (
                                                <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                                                    {p.name} (Disp: {p.quantity})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            placeholder="Qtà"
                                            className="w-20 text-sm rounded-md border bg-background px-3 py-2"
                                            value={partQty}
                                            onChange={e => setPartQty(Number(e.target.value))}
                                        />
                                        <button type="submit" className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-medium">
                                            Scarica
                                        </button>
                                    </div>
                                </form>
                            )}

                            {!wo.partsUsed || wo.partsUsed.length === 0 ? (
                                <div className="text-sm text-muted-foreground italic py-1">
                                    Nessun materiale utilizzato.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {wo.partsUsed.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded-md">
                                            <span className="font-medium truncate max-w-[120px]">{p.partName}</span>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <span>x{p.quantity}</span>
                                                <span>€{(p.unitCost * p.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 mb-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Costo Ricambi</span>
                                <span className="font-mono">€{partsCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Costo Manodopera</span>
                                <span className="font-mono">€{laborCost.toFixed(2)}</span>
                            </div>
                            <div className="pt-2 border-t flex justify-between font-bold text-base">
                                <span>Totale</span>
                                <span>€{totalCost.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Labor Tracking */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Manodopera
                            </h3>
                            <button
                                onClick={() => setIsAddingLabor(!isAddingLabor)}
                                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
                            >
                                + Aggiungi Ore
                            </button>
                        </div>

                        {isAddingLabor && (
                            <form onSubmit={handleAddLabor} className="bg-muted/30 p-4 rounded-lg space-y-3 animate-in fade-in zoom-in-95">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-medium mb-1 block">Tecnico</label>
                                        <select
                                            required
                                            className="w-full text-sm rounded-md border bg-background px-3 py-2"
                                            value={selectedTechId}
                                            onChange={e => setSelectedTechId(e.target.value)}
                                        >
                                            <option value="">Seleziona Tecnico...</option>
                                            {technicians.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} (€{t.hourlyRate}/h)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block">Ore</label>
                                        <input
                                            type="number"
                                            min="0.5"
                                            step="0.5"
                                            required
                                            className="w-full text-sm rounded-md border bg-background px-3 py-2"
                                            value={laborHours}
                                            onChange={e => setLaborHours(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium">
                                        Aggiungi
                                    </button>
                                </div>
                            </form>
                        )}

                        {!wo.laborLogs || wo.laborLogs.length === 0 ? (
                            <div className="text-sm text-muted-foreground italic py-2">
                                Nessuna attività registrata.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {wo.laborLogs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded-md">
                                        <span className="font-medium">{log.technicianName}</span>
                                        <div className="flex items-center gap-4 text-muted-foreground">
                                            <span>{log.hours}h</span>
                                            <span className="text-xs">{new Date(log.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>


                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dettagli</h3>

                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-sm">Stato</span>
                            <WOStatusBadge status={wo.status} />
                        </div>

                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-sm">Priorità</span>
                            <WOPriorityBadge priority={wo.priority} />
                        </div>

                        <div className="flex items-center gap-3 py-2 border-b">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Assegnato a</span>
                                <span className="text-sm font-medium">{wo.assignedTo}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 py-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Scadenza</span>
                                <span className="text-sm font-medium">{wo.dueDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Total Cost Widget */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Riepilogo Costi</h3>

                        <div className="space-y-2 py-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Ricambi</span>
                                <span>€{partsCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Manodopera</span>
                                <span>€{laborCost.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                <span>Totale</span>
                                <span>€{totalCost.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <WOApproveDialog
                workOrderId={wo.id}
                isOpen={showApproveDialog}
                onClose={() => setShowApproveDialog(false)}
            />

            <WOAssignDialog
                workOrderId={assigning ? wo.id : null}
                currentTechnicianId={wo.assignedTechnicianId}
                onClose={() => setAssigning(false)}
            />
        </div>
    );
}
