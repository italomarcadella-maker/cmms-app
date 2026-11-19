"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { useAuth } from "@/lib/auth-context";
import { usePlant } from "@/lib/plant-context";
import { OPERATIVE, hasRole } from "@/lib/roles";
import { MATERIAL_STATUSES, MATERIAL_STATUS_LABELS, isOpenMaterialStatus } from "@/modules/inventory/domain/material-request";
import { MaterialRequestCard } from "@/components/material-requests/request-card";
import { NewMaterialRequestDialog } from "@/components/material-requests/new-request-dialog";
import {
    cancelMaterialRequest, deliverMaterialRequest, listMaterialRequests, markMaterialRequestReady, rejectMaterialRequest,
    type MaterialRequestRow,
} from "@/modules/inventory/adapters/actions/material-request-actions";

type Filter = "OPEN" | "ALL" | (typeof MATERIAL_STATUSES)[number];

export default function MaterialRequestsPage() {
    const { user } = useAuth();
    const { selected } = usePlant();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const { ask, dialog: promptDialog } = usePrompt();

    const canHandle = hasRole(user?.role, OPERATIVE);
    const [version, setVersion] = useState(0);
    const [mine, setMine] = useState<MaterialRequestRow[] | null>(null);
    const [all, setAll] = useState<MaterialRequestRow[] | null>(null);
    const [filter, setFilter] = useState<Filter>("OPEN");
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        Promise.all([listMaterialRequests("mine"), canHandle ? listMaterialRequests("all") : Promise.resolve(null)]).then(([m, a]) => {
            if (!alive) return;
            setMine(m);
            setAll(a);
        });
        return () => { alive = false; };
    }, [version, selected, canHandle]);

    const reload = () => setVersion(v => v + 1);

    const openCount = useMemo(() => (all ?? []).filter(r => isOpenMaterialStatus(r.status)).length, [all]);
    const visible = useMemo(() => {
        const rows = all ?? [];
        if (filter === "ALL") return rows;
        if (filter === "OPEN") return rows.filter(r => isOpenMaterialStatus(r.status));
        return rows.filter(r => r.status === filter);
    }, [all, filter]);

    // Dopo ogni azione si ricarica l'elenco anche se e' fallita: lo stato potrebbe essere cambiato nel frattempo
    const run = async (id: string, action: () => Promise<{ success: boolean; message: string }>) => {
        setBusyId(id);
        try {
            const res = await action();
            if (res.success) toast.success(res.message); else toast.error(res.message);
        } catch {
            toast.error("Operazione non riuscita. Riprova.");
        } finally {
            setBusyId(null);
            reload();
        }
    };

    const onCancel = async (r: MaterialRequestRow) => {
        const yes = await confirm({ title: "Annullare la richiesta?", description: "La manutenzione non la vedrà più tra quelle da evadere.", confirmLabel: "Annulla richiesta", cancelLabel: "Indietro", variant: "destructive" });
        if (yes) await run(r.id, () => cancelMaterialRequest(r.id));
    };

    const onReady = async (r: MaterialRequestRow) => {
        const note = await ask({
            title: "Pronto da ritirare",
            description: `${r.requesterName} riceverà un avviso.`,
            label: "Nota per chi ha richiesto (facoltativa)",
            placeholder: "Es. ritiro in magazzino manutenzione, scaffale B",
            confirmLabel: "Segna come pronto",
        });
        if (note !== null) await run(r.id, () => markMaterialRequestReady(r.id, note));
    };

    const onDeliver = async (r: MaterialRequestRow) => {
        const yes = await confirm({
            title: "Segnare la richiesta come consegnata?",
            description: "La giacenza del magazzino verrà scaricata delle quantità richieste. L'operazione non si può annullare.",
            confirmLabel: "Consegnata",
            cancelLabel: "Indietro",
        });
        if (yes) await run(r.id, () => deliverMaterialRequest(r.id));
    };

    const onReject = async (r: MaterialRequestRow) => {
        const reason = await ask({
            title: "Rifiuta la richiesta",
            description: `Il motivo viene comunicato a ${r.requesterName}.`,
            label: "Motivo del rifiuto",
            required: true,
            confirmLabel: "Rifiuta",
            variant: "destructive",
        });
        if (reason !== null) await run(r.id, () => rejectMaterialRequest(r.id, reason));
    };

    const newButton = (
        <NewMaterialRequestDialog trigger={<Button><Plus className="h-4 w-4" /> Nuova richiesta</Button>} onSaved={reload} />
    );

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader
                title="Richieste di materiale"
                description="Chiedi alla manutenzione il materiale di cui ha bisogno il tuo reparto e segui a che punto è."
                actions={newButton}
            />

            <Tabs defaultValue="mine">
                <TabsList>
                    <TabsTrigger value="mine">Le mie richieste</TabsTrigger>
                    {canHandle && <TabsTrigger value="handle">Da evadere{all !== null ? ` (${openCount})` : ""}</TabsTrigger>}
                </TabsList>

                <TabsContent value="mine" className="mt-4 space-y-3">
                    {mine === null ? <p className="text-sm text-muted-foreground">Caricamento...</p> : mine.length === 0 ? (
                        <Card><EmptyState icon={<PackageOpen />} title="Non hai ancora fatto richieste" description="Quando ti serve del materiale dal magazzino manutenzione, crea una richiesta: qui ne segui lo stato." action={newButton} /></Card>
                    ) : mine.map(r => (
                        <MaterialRequestCard key={r.id} request={r} mode="mine" busy={busyId === r.id} onCancel={onCancel} />
                    ))}
                </TabsContent>

                {canHandle && (
                    <TabsContent value="handle" className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="mr-filter" className="text-sm text-muted-foreground">Stato</Label>
                            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                                <SelectTrigger id="mr-filter" className="w-[220px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OPEN">Da lavorare</SelectItem>
                                    <SelectItem value="ALL">Tutte</SelectItem>
                                    {MATERIAL_STATUSES.map(s => <SelectItem key={s} value={s}>{MATERIAL_STATUS_LABELS[s]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {all === null ? <p className="text-sm text-muted-foreground">Caricamento...</p> : visible.length === 0 ? (
                            <Card><EmptyState icon={<PackageOpen />} title={filter === "OPEN" ? "Nessuna richiesta da evadere" : "Nessuna richiesta con questo stato"} description={filter === "OPEN" ? "Le richieste dei reparti compaiono qui appena arrivano." : undefined} /></Card>
                        ) : visible.map(r => (
                            <MaterialRequestCard
                                key={r.id}
                                request={r}
                                mode="handle"
                                busy={busyId === r.id}
                                onReady={onReady}
                                onDeliver={onDeliver}
                                onReject={onReject}
                            />
                        ))}
                    </TabsContent>
                )}
            </Tabs>

            {confirmDialog}
            {promptDialog}
        </div>
    );
}
