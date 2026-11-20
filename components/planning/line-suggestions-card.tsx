"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { tk } from "@/lib/i18n/translate";
import { useT, useFormat } from "@/lib/i18n/client";
import type { TFunction } from "@/lib/i18n/client";
import { CalendarClock, ClipboardList, ExternalLink, Factory } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PriorityPill, WorkOrderStatusPill } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { frequencyLabel } from "@/modules/maintenance/domain/asset-reliability";
import type { OpportunityState } from "@/modules/maintenance/domain/line-opportunities";
import {
    generateWorkOrdersFromPlans,
    type LineOpportunityDTO,
    type LineOpportunityItemDTO,
} from "@/modules/maintenance/adapters/actions/line-opportunity-actions";

// Lo stato e' sempre scritto per esteso: il colore da solo non basta
const STATE_VARIANT: Record<OpportunityState, "critical" | "warning" | "info" | "neutral"> = {
    OVERDUE: "critical",
    DUE_SOON: "warning",
    ANTICIPATABLE: "info",
    PENDING: "neutral",
};

const ORDER_TYPE: Record<string, string> = { FAULT: tk("Guasto"), ROUTINE: tk("Manutenzione programmata"), REQUEST: tk("Richiesta") };

function StateBadge({ item }: { item: LineOpportunityItemDTO }) {
    return <Badge variant={STATE_VARIANT[item.state]}>{item.stateLabel}</Badge>;
}

function kindLabel(item: LineOpportunityItemDTO, t: TFunction): string {
    switch (item.kind) {
        case "ORDER": return t(ORDER_TYPE[item.orderType ?? ""] ?? tk("Ordine di lavoro"));
        case "CONTRACTOR": return item.contractorName ? t("Ditta esterna: {name}", { name: item.contractorName }) : t("Ditta esterna");
        case "METER": return t("Lettura contatore");
        default: return t("Manutenzione programmata");
    }
}

/** Dove si apre la voce: l'ordine, la ditta, la pagina Impianti per le letture. */
function openLink(item: LineOpportunityItemDTO, t: TFunction): { href: string; label: string } | null {
    switch (item.kind) {
        case "ORDER": return { href: `/work-orders/${item.refId}`, label: t("Apri ordine") };
        case "CONTRACTOR": return item.contractorId ? { href: `/contractors/${item.contractorId}`, label: t("Apri ditta") } : null;
        case "METER": return { href: "/impianti", label: t("Apri impianti") };
        default: return null;
    }
}

function AssetLink({ item }: { item: LineOpportunityItemDTO }) {
    return <Link href={`/assets/${item.assetId}`} className="hover:text-primary hover:underline">{item.assetName}</Link>;
}

function PendingTable({ items }: { items: LineOpportunityItemDTO[] }) {
    const t = useT();
    const fmt = useFormat();
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("Titolo")}</TableHead>
                    <TableHead>{t("Macchina")}</TableHead>
                    <TableHead>{t("Tipo")}</TableHead>
                    <TableHead>{t("Priorità / stato")}</TableHead>
                    <TableHead>{t("Scadenza")}</TableHead>
                    <TableHead>{t("Assegnatario")}</TableHead>
                    <TableHead className="w-[1%]"><span className="sr-only">{t("Apri")}</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map(item => {
                    const link = openLink(item, t);
                    return (
                        <TableRow key={item.key}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell className="text-sm"><AssetLink item={item} /></TableCell>
                            <TableCell className="text-sm">{kindLabel(item, t)}</TableCell>
                            <TableCell>
                                {item.kind === "ORDER" ? (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {item.priority && <PriorityPill priority={item.priority} />}
                                        {item.status && <WorkOrderStatusPill status={item.status} />}
                                    </div>
                                ) : <span className="text-sm text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm tabular-nums">{fmt.date(item.dueDate)}</span>
                                    <StateBadge item={item} />
                                </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.assigneeName ?? t("Non assegnato")}</TableCell>
                            <TableCell>
                                {link && (
                                    <Button asChild size="sm" variant="ghost">
                                        <Link href={link.href}>{link.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden /></Link>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

interface PlansTableProps {
    items: LineOpportunityItemDTO[];
    canGenerate: boolean;
    selected: string[];
    onToggle: (id: string, checked: boolean) => void;
}

function PlansTable({ items, canGenerate, selected, onToggle }: PlansTableProps) {
    const t = useT();
    const fmt = useFormat();
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {canGenerate && <TableHead className="w-[1%]"><span className="sr-only">{t("Seleziona")}</span></TableHead>}
                    <TableHead>{t("Piano")}</TableHead>
                    <TableHead>{t("Macchina")}</TableHead>
                    <TableHead>{t("Frequenza")}</TableHead>
                    <TableHead>{t("Ultima esecuzione")}</TableHead>
                    <TableHead>{t("Scadenza")}</TableHead>
                    <TableHead>{t("Stato")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map(item => (
                    <TableRow key={item.key} data-state={selected.includes(item.refId) ? "selected" : undefined}>
                        {canGenerate && (
                            <TableCell>
                                <Checkbox
                                    aria-label={t("Seleziona {title}", { title: item.title })}
                                    checked={selected.includes(item.refId)}
                                    onCheckedChange={checked => onToggle(item.refId, checked)}
                                />
                            </TableCell>
                        )}
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="text-sm"><AssetLink item={item} /></TableCell>
                        <TableCell className="text-sm">{t(frequencyLabel(item.frequency))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.lastRunDate ? fmt.date(item.lastRunDate) : t("Mai eseguita")}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmt.date(item.dueDate)}</TableCell>
                        <TableCell><StateBadge item={item} /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

/** Scheda di una linea senza calendario: attività pendenti e manutenzioni programmate eseguibili ora. */
export function LineSuggestionsCard({ line, canGenerate, onChanged }: { line: LineOpportunityDTO; canGenerate: boolean; onChanged: () => void }) {
    const t = useT();
    const { confirm, dialog } = useConfirm();
    const [picked, setPicked] = useState<string[]>([]);
    const [generating, setGenerating] = useState(false);

    // Solo i piani ancora presenti: dopo un ricaricamento le selezioni non piu' valide cadono da sole
    const planIds = line.executable.map(i => i.refId);
    const selected = picked.filter(id => planIds.includes(id));
    const allSelected = planIds.length > 0 && selected.length === planIds.length;

    const toggle = (id: string, checked: boolean) => setPicked(cur => (checked ? [...new Set([...cur, id])] : cur.filter(x => x !== id)));
    const toggleAll = () => setPicked(allSelected ? [] : planIds);

    const generate = async () => {
        const n = selected.length;
        const ok = await confirm({
            title: n === 1 ? t("Generare 1 scheda di lavoro?") : t("Generare {n} schede di lavoro?", { n }),
            description: t("Per ogni manutenzione selezionata si crea un ordine di lavoro con data di oggi. La scadenza del piano si sposta in avanti, come se fosse stato eseguito oggi: le date non si ripristinano da questa pagina."),
            confirmLabel: t("Genera le schede"),
        });
        if (!ok) return;
        setGenerating(true);
        try {
            const res = await generateWorkOrdersFromPlans(selected);
            const titleOf = (id: string) => line.executable.find(i => i.refId === id)?.title ?? t("Manutenzione");
            const details = res.errors.map(e => `${titleOf(e.scheduleId)}: ${e.message}`).join(" · ");
            if (res.created > 0 && res.errors.length === 0) toast.success(res.message);
            else if (res.created > 0) toast.warning(res.message, { description: details });
            else toast.error(details || res.message);
            setPicked([]);
            if (res.created > 0 || res.errors.length > 0) onChanged();
        } catch {
            toast.error(t("Impossibile generare le schede. Riprova."));
        } finally {
            setGenerating(false);
        }
    };

    const c = line.counts;
    return (
        <Card>
            <CardContent className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                            <Factory className="h-4 w-4 text-muted-foreground" aria-hidden />
                            {line.line}
                        </h2>
                        <p className="text-xs text-muted-foreground">{line.plantName ? t("Stabilimento {name}", { name: line.plantName }) : t("Stabilimento non indicato")}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant="info">{c.pending === 1 ? t("1 attività pendente") : t("{n} attività pendenti", { n: c.pending })}</Badge>
                        <Badge variant="info">{c.executable === 1 ? t("1 manutenzione eseguibile") : t("{n} manutenzioni eseguibili", { n: c.executable })}</Badge>
                        {c.overdue > 0 && <Badge variant="critical">{t("{n} in ritardo", { n: c.overdue })}</Badge>}
                    </div>
                </div>

                <section aria-label={t("Attività pendenti, {line}", { line: line.line })} className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden /> {t("Attività pendenti")}</h3>
                    {line.pending.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{t("Nessuna attività pendente su questa linea.")}</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border"><PendingTable items={line.pending} /></div>
                    )}
                </section>

                <section aria-label={t("Manutenzioni programmate eseguibili, {line}", { line: line.line })} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden /> {t("Manutenzioni programmate eseguibili")}</h3>
                        {canGenerate && line.executable.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button size="sm" variant="outline" onClick={toggleAll} disabled={generating}>
                                    {allSelected ? t("Deseleziona tutte") : t("Seleziona tutte")}
                                </Button>
                                <Button size="sm" onClick={generate} disabled={generating || selected.length === 0}>
                                    {generating ? t("Generazione in corso...") : selected.length > 0 ? t("Genera le schede selezionate ({n})", { n: selected.length }) : t("Genera le schede selezionate")}
                                </Button>
                            </div>
                        )}
                    </div>
                    {line.executable.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{t("Nessuna manutenzione programmata da eseguire entro l'orizzonte scelto.")}</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border">
                                <PlansTable items={line.executable} canGenerate={canGenerate} selected={selected} onToggle={toggle} />
                            </div>
                            {!canGenerate && <p className="text-xs text-muted-foreground">{t("La generazione delle schede è riservata a supervisor, responsabili di plant e amministratori.")}</p>}
                        </>
                    )}
                </section>
            </CardContent>
            {dialog}
        </Card>
    );
}
