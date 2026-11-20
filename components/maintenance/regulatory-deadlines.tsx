"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat, type TFunction } from "@/lib/i18n/client";
import { AlertTriangle, CheckCircle2, Clock, Download, FileText, HelpCircle, Scale } from "lucide-react";

import {
    REGULATORY_STATUS_LABELS,
    buildRegulatoryCsv,
    daysUntil,
    filterByStatus,
    type RegulatoryFilter,
    type RegulatoryRow,
    type RegulatoryStatus,
    type RegulatoryTotals,
} from "@/modules/maintenance/domain/regulatory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const STATUS_VARIANT: Record<RegulatoryStatus, "critical" | "warning" | "success" | "neutral"> = {
    OVERDUE: "critical",
    EXPIRING: "warning",
    OK: "success",
    UNKNOWN: "neutral",
};

const STATUS_ICON: Record<RegulatoryStatus, typeof AlertTriangle> = {
    OVERDUE: AlertTriangle,
    EXPIRING: Clock,
    OK: CheckCircle2,
    UNKNOWN: HelpCircle,
};

function StatusBadge({ status }: { status: RegulatoryStatus }) {
    const t = useT();
    const Icon = STATUS_ICON[status];
    return (
        <Badge variant={STATUS_VARIANT[status]} className="whitespace-nowrap">
            <Icon className="mr-1 h-3 w-3" aria-hidden />
            {t(REGULATORY_STATUS_LABELS[status])}
        </Badge>
    );
}

function dueNote(row: RegulatoryRow, t: TFunction): string | null {
    if (row.status === "UNKNOWN") return row.triggerType === "METER" ? t("Servono letture del contatore") : null;
    if (row.usage && row.status === "OVERDUE") return t("Intervallo di consumo raggiunto");
    const days = daysUntil(row.nextDueDate);
    if (days === null) return row.triggerType === "METER" ? t("Stima non disponibile (servono almeno due letture)") : null;
    if (days < 0) return Math.abs(days) === 1 ? t("Scaduta da 1 giorno") : t("Scaduta da {n} giorni", { n: Math.abs(days) });
    if (days === 0) return t("Scade oggi");
    return days === 1 ? t("Tra 1 giorno") : t("Tra {n} giorni", { n: days });
}

const todayStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function RegulatoryDeadlines({ rows, totals }: { rows: RegulatoryRow[]; totals: RegulatoryTotals }) {
    const t = useT();
    const fmt = useFormat();
    // Il grassetto sta dentro la frase: si traduce la frase intera con un segnaposto e lo si sostituisce con il testo in evidenza
    const [noteBefore, noteAfter] = t("Dopo ogni verifica carica il certificato o il verbale tra i {bold} (scheda dell'asset, sezione Documenti e SOP): resta così collegato alla macchina e disponibile per ispezioni e audit.", { bold: "{bold}" }).split("{bold}");
    const [filter, setFilter] = useState<RegulatoryFilter>("ALL");
    const visible = useMemo(() => filterByStatus(rows, filter), [rows, filter]);

    const options: { value: RegulatoryFilter; label: string }[] = [
        { value: "ALL", label: t("Tutte ({count})", { count: totals.total }) },
        { value: "OVERDUE", label: t("Scadute ({count})", { count: totals.overdue }) },
        { value: "EXPIRING", label: t("In scadenza ({count})", { count: totals.expiring }) },
        { value: "OK", label: t("In regola ({count})", { count: totals.ok }) },
        ...(totals.unknown > 0 ? [{ value: "UNKNOWN" as RegulatoryFilter, label: t("Dati insufficienti ({count})", { count: totals.unknown }) }] : []),
    ];

    const handleExport = () => {
        if (visible.length === 0) {
            toast.warning(t("Non ci sono righe da esportare"));
            return;
        }
        try {
            const blob = new Blob([buildRegulatoryCsv(visible)], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `scadenziario-normativo-${todayStamp()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(visible.length === 1 ? t("Esportata 1 riga") : t("Esportate {n} righe", { n: visible.length }));
        } catch {
            toast.error(t("Errore nell'esportazione"));
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label={t("Verifiche di legge")} value={totals.total} icon={<Scale />} tone="info" />
                <StatCard label={t("Scadute")} value={totals.overdue} icon={<AlertTriangle />} tone={totals.overdue > 0 ? "critical" : "neutral"} />
                <StatCard label={t("In scadenza entro 30 giorni")} value={totals.expiring} icon={<Clock />} tone={totals.expiring > 0 ? "warning" : "neutral"} />
                <StatCard label={t("In regola")} value={totals.ok} icon={<CheckCircle2 />} tone="success" />
            </div>

            <div className="flex items-start gap-3 rounded-xl border bg-info-soft/40 p-4 text-sm">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-info-strong" aria-hidden />
                <p>
                    {noteBefore}<span className="font-medium">{t("documenti dell'asset")}</span>{noteAfter}
                </p>
            </div>

            {rows.length === 0 ? (
                <EmptyState
                    icon={<Scale />}
                    title={t("Nessuna verifica di legge registrata")}
                    description={t("Nella scheda di un asset, creando un piano di manutenzione, spunta la casella 'Manutenzione o verifica di legge' e indica norma ed ente.")}
                />
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <SegmentedControl aria-label={t("Filtra per stato")} options={options} value={filter} onChange={setFilter} className="max-w-full flex-wrap" />
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-1.5 h-4 w-4" /> {t("Esporta CSV ({count})", { count: visible.length })}
                        </Button>
                    </div>

                    {visible.length === 0 ? (
                        <EmptyState title={t("Nessuna verifica in questo stato")} className="py-8" />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("Stato")}</TableHead>
                                        <TableHead>{t("Asset")}</TableHead>
                                        <TableHead>{t("Verifica")}</TableHead>
                                        <TableHead>{t("Riferimento normativo ed ente")}</TableHead>
                                        <TableHead>{t("Ultima esecuzione")}</TableHead>
                                        <TableHead>{t("Prossima scadenza")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visible.map((r) => {
                                        const note = dueNote(r, t);
                                        return (
                                            <TableRow key={r.scheduleId}>
                                                <TableCell>
                                                    <StatusBadge status={r.status} />
                                                </TableCell>
                                                <TableCell>
                                                    <Link href={`/assets/${r.assetId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                                                        {r.assetName}
                                                    </Link>
                                                    {r.plantName && <div className="text-xs text-muted-foreground">{r.plantName}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{r.title}</div>
                                                    {r.usage && r.usage.consumed !== null && r.usage.interval !== null && (
                                                        <div className="text-xs tabular-nums text-muted-foreground">
                                                            {t("A consumo:")} {fmt.number(r.usage.consumed, { maximumFractionDigits: 2 })} / {fmt.number(r.usage.interval, { maximumFractionDigits: 2 })}
                                                            {r.usage.unit ? ` ${r.usage.unit}` : ""}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div>{r.legalReference ?? <span className="text-muted-foreground">{t("Non indicato")}</span>}</div>
                                                    <div className="text-xs text-muted-foreground">{r.authority ? t("Ente: {name}", { name: r.authority }) : t("Ente non indicato")}</div>
                                                </TableCell>
                                                <TableCell className="text-sm tabular-nums">{r.lastRunDate ? fmt.date(r.lastRunDate) : t("Mai eseguita")}</TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="font-medium tabular-nums">
                                                        {r.nextDueDate ? fmt.date(r.nextDueDate) : t("Non calcolabile")}
                                                        {r.nextDueDate && r.triggerType === "METER" && <span className="font-normal text-muted-foreground"> {t("(stimata)")}</span>}
                                                    </div>
                                                    {note && <div className="text-xs text-muted-foreground">{note}</div>}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
