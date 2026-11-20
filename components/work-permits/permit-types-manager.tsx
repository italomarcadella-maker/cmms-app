"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { Pencil, Plus, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPermitTypes, updatePermitType, type PermitTypeRow, type PermitTypesData } from "@/modules/maintenance/adapters/actions/work-permit-actions";
import { PermitTypeDialog } from "./permit-type-dialog";

/** Gestione dei tipi di permesso (amministratori e responsabili di plant). L'elenco parte vuoto: i tipi si creano da qui. */
export function PermitTypesManager({ reloadKey }: { reloadKey?: string }) {
    const t = useT();
    const [version, setVersion] = useState(0);
    const [result, setResult] = useState<{ key: string; data: PermitTypesData | null } | null>(null);
    const [editing, setEditing] = useState<PermitTypeRow | null>(null);
    const [creating, setCreating] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const key = `${reloadKey ?? ""}:${version}`;

    useEffect(() => {
        let alive = true;
        getPermitTypes()
            .then(data => { if (alive) setResult({ key, data }); })
            .catch(e => { console.error(e); if (alive) setResult({ key, data: null }); });
        return () => { alive = false; };
    }, [key]);

    const reload = () => setVersion(v => v + 1);
    const data = result?.data ?? null;

    const toggleActive = async (ty: PermitTypeRow, isActive: boolean) => {
        setBusyId(ty.id);
        try {
            const res = await updatePermitType(ty.id, {
                name: ty.name,
                description: ty.description,
                requiredQualificationId: ty.requiredQualificationId,
                requiresApproval: ty.requiresApproval,
                defaultValidityHours: ty.defaultValidityHours,
                precautions: ty.precautions,
                isActive,
            });
            if (res.success) toast.success(isActive ? t("Tipo riattivato.") : t("Tipo disattivato.")); else toast.error(res.message);
            reload();
        } catch {
            toast.error(t("Errore di connessione. Riprova."));
        } finally {
            setBusyId(null);
        }
    };

    if (result && !data) {
        return <p role="alert" className="rounded-lg border border-transparent bg-critical-soft p-3 text-sm text-critical-strong">{t("Impossibile caricare i tipi di permesso. Riprova tra qualche istante.")}</p>;
    }
    if (!data) return <Skeleton className="h-40 w-full" />;

    return (
        <div className="space-y-3" aria-busy={result?.key !== key}>
            {data.types.length === 0 ? (
                <EmptyState
                    icon={<ShieldAlert />}
                    title={t("Nessun tipo di permesso definito")}
                    description={t("Definisci i tipi di permesso previsti dalle tue procedure (nome, abilitazione richiesta, ore di validità, precauzioni da spuntare). Finché non ce ne sono, nessun ordine può richiedere permessi.")}
                    action={<Button type="button" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" aria-hidden />{t("Crea il primo tipo")}</Button>}
                />
            ) : (
                <>
                    <div className="flex justify-end">
                        <Button type="button" size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" aria-hidden />{t("Aggiungi tipo")}</Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Nome")}</TableHead>
                                    <TableHead>{t("Abilitazione richiesta")}</TableHead>
                                    <TableHead>{t("Approvazione")}</TableHead>
                                    <TableHead className="text-right">{t("Validità (ore)")}</TableHead>
                                    <TableHead className="text-right">{t("Precauzioni")}</TableHead>
                                    <TableHead>{t("Stato")}</TableHead>
                                    <TableHead><span className="sr-only">{t("Azioni")}</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.types.map(ty => (
                                    <TableRow key={ty.id} className={ty.isActive ? "" : "text-muted-foreground"}>
                                        <TableCell className="font-medium">{ty.name}</TableCell>
                                        <TableCell>{ty.requiredQualificationName ?? t("Nessuna")}</TableCell>
                                        <TableCell>{ty.requiresApproval ? t("Richiesta") : t("Non richiesta")}</TableCell>
                                        <TableCell className="text-right">{ty.defaultValidityHours ?? "-"}</TableCell>
                                        <TableCell className="text-right">{ty.precautions.length}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={ty.isActive} disabled={busyId === ty.id} onCheckedChange={c => toggleActive(ty, c)} aria-label={ty.isActive ? t("Disattiva {name}", { name: ty.name }) : t("Attiva {name}", { name: ty.name })} />
                                                <Badge variant={ty.isActive ? "success" : "neutral"}>{ty.isActive ? t("Attivo") : t("Disattivato")}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button type="button" variant="ghost" size="icon" aria-label={t("Modifica {name}", { name: ty.name })} title={t("Modifica")} onClick={() => setEditing(ty)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
            <PermitTypeDialog
                open={creating || !!editing}
                type={editing}
                qualifications={data.qualifications}
                onClose={() => { setCreating(false); setEditing(null); }}
                onSaved={reload}
            />
        </div>
    );
}
