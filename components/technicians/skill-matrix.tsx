"use client";

import { useMemo, useState } from "react";
import { Download, Filter, Printer, Search, Settings2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { SkillMatrix } from "@/modules/maintenance/adapters/actions/skill-matrix-actions";
import {
    DEFAULT_MIN_LEVEL, SKILL_LEVEL_LABEL, coverage, isQualificationValid, skillLevelLabel, type SkillLevel,
} from "@/modules/maintenance/domain/skill-matrix";
import { QualificationCell, SkillCell, dayToIso, fmtDate, qualificationCellInfo } from "./skill-matrix-cells";
import { SkillTypesDialog } from "./skill-matrix-types-dialog";

const ALL = "all";
const key = (a: string, b: string) => `${a}|${b}`;

/** Campo CSV con separatore ";": virgolette se serve; i testi che iniziano come una formula vengono neutralizzati per Excel. */
function csvField(value: string | number): string {
    let s = String(value);
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function SkillMatrixView({ initial, onReload }: { initial: SkillMatrix; onReload: () => void }) {
    const t = useT();
    const [data, setData] = useState(initial);
    // Quando la pagina passa dati nuovi (cambio di stabilimento, ricarica) si riparte da quelli
    const [seen, setSeen] = useState(initial);
    if (initial !== seen) { setSeen(initial); setData(initial); }

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState(ALL); // "all" | "q:<id>" | "s:<id>"
    const [minLevel, setMinLevel] = useState(String(DEFAULT_MIN_LEVEL));
    const now = useMemo(() => new Date(), []);

    const { technicians, qualificationTypes, skillTypes, canEdit, canManageTypes } = data;

    // Indici per cella
    const qualMap = useMemo(() => new Map(data.qualifications.map(q => [key(q.technicianId, q.typeId), q.expiresAt])), [data.qualifications]);
    const levelMap = useMemo(() => new Map(data.levels.map(l => [key(l.technicianId, l.skillId), l.level])), [data.levels]);

    const levelOf = (techId: string, skillId: string) => levelMap.get(key(techId, skillId)) ?? 0;

    // Copertura per colonna (su tutti i tecnici, non solo su quelli filtrati)
    const qualCoverage = (typeId: string) => technicians.filter(t => {
        const e = qualMap.get(key(t.id, typeId));
        return e !== undefined && isQualificationValid(e ? new Date(e) : null, now);
    }).length;
    const skillCoverage = (skillId: string) => coverage(technicians.map(t => levelOf(t.id, skillId)));

    // Filtri
    const filterKnown = filter === ALL
        || (filter.startsWith("q:") && qualificationTypes.some(t => t.id === filter.slice(2)))
        || (filter.startsWith("s:") && skillTypes.some(t => t.id === filter.slice(2)));
    const activeFilter = filterKnown ? filter : ALL;
    const needle = search.trim().toLowerCase();

    const visible = technicians.filter(t => {
        if (needle && !t.name.toLowerCase().includes(needle)) return false;
        if (activeFilter.startsWith("q:")) {
            const e = qualMap.get(key(t.id, activeFilter.slice(2)));
            return e !== undefined && isQualificationValid(e ? new Date(e) : null, now);
        }
        if (activeFilter.startsWith("s:")) return levelOf(t.id, activeFilter.slice(2)) >= Number(minLevel);
        return true;
    });

    const plantNames = new Set(technicians.map(t => t.plantName).filter(Boolean));
    const showPlant = plantNames.size > 1;

    // Aggiornamenti locali dopo un salvataggio riuscito (evita di ricaricare tutta la matrice)
    const applyLevel = (technicianId: string, skillId: string, level: SkillLevel) =>
        setData(d => ({
            ...d,
            levels: [
                ...d.levels.filter(l => !(l.technicianId === technicianId && l.skillId === skillId)),
                ...(level > 0 ? [{ technicianId, skillId, level }] : []),
            ],
        }));
    const applyQualification = (technicianId: string, typeId: string, enabled: boolean, expiresAt: string | null) =>
        setData(d => ({
            ...d,
            qualifications: [
                ...d.qualifications.filter(q => !(q.technicianId === technicianId && q.typeId === typeId)),
                ...(enabled ? [{ technicianId, typeId, expiresAt }] : []),
            ],
        }));

    const exportCsv = () => {
        const header = [
            "Tecnico", "Specialità", "Stabilimento",
            ...qualificationTypes.map(q => `Abilitazione: ${q.name}`),
            ...skillTypes.map(s => `Competenza: ${s.name} (livello 0-4)`),
        ];
        const rows = visible.map(t => [
            t.name, t.specialty, t.plantName ?? "",
            ...qualificationTypes.map(q => {
                const e = qualMap.get(key(t.id, q.id));
                if (e === undefined) return "";
                const info = qualificationCellInfo(e, now);
                if (info.state === "EXPIRED") return `Scaduta il ${fmtDate(e!)}`;
                if (info.state === "EXPIRING") return `Scade il ${fmtDate(e!)}`;
                return e ? `Valida fino al ${fmtDate(e)}` : "Valida";
            }),
            ...skillTypes.map(s => levelOf(t.id, s.id)),
        ]);
        rows.push([
            "Copertura (tutti i tecnici)", "", "",
            ...qualificationTypes.map(q => qualCoverage(q.id)),
            ...skillTypes.map(s => skillCoverage(s.id)),
        ]);
        const csv = "﻿" + [header, ...rows].map(r => r.map(csvField).join(";")).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `matrice-competenze-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const hasColumns = qualificationTypes.length + skillTypes.length > 0;

    return (
        <div className="space-y-4">
            {/* Controlli (non si stampano) */}
            <div className="flex flex-wrap items-end gap-3 print:hidden">
                <div className="grid gap-1.5">
                    <Label htmlFor="matrix-search" className="text-xs">{t("Cerca per nome")}</Label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                        <Input id="matrix-search" className="w-full pl-8 sm:w-56" placeholder={t("Nome del tecnico")} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>
                {hasColumns && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="matrix-filter" className="flex items-center gap-1.5 text-xs"><Filter className="h-3.5 w-3.5" aria-hidden /> {t("Mostra solo chi ha")}</Label>
                        <Select value={activeFilter} onValueChange={setFilter}>
                            <SelectTrigger id="matrix-filter" className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t("Tutti i tecnici")}</SelectItem>
                                {qualificationTypes.map(q => <SelectItem key={q.id} value={`q:${q.id}`}>{t("Abilitazione valida: {name}", { name: q.name })}</SelectItem>)}
                                {skillTypes.map(s => <SelectItem key={s.id} value={`s:${s.id}`}>{t("Competenza: {name}", { name: s.name })}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {activeFilter.startsWith("s:") && (
                    <div className="grid gap-1.5">
                        <Label htmlFor="matrix-min" className="text-xs">{t("Livello minimo")}</Label>
                        <Select value={minLevel} onValueChange={setMinLevel}>
                            <SelectTrigger id="matrix-min" className="w-full sm:w-52"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {([1, 2, 3, 4] as SkillLevel[]).map(l => <SelectItem key={l} value={String(l)}>{l} - {t(skillLevelLabel(l))}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {canManageTypes && (
                        <SkillTypesDialog
                            onChanged={onReload}
                            trigger={<Button type="button" variant="outline"><Settings2 className="mr-1.5 h-4 w-4" /> {t("Gestisci competenze")}</Button>}
                        />
                    )}
                    <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> {t("Stampa")}</Button>
                    <Button type="button" variant="outline" onClick={exportCsv} disabled={technicians.length === 0}><Download className="mr-1.5 h-4 w-4" /> {t("Esporta CSV")}</Button>
                </div>
            </div>

            {technicians.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<Users />}
                        title={t("Nessun tecnico da mostrare")}
                        description={t("Non ci sono tecnici nello stabilimento selezionato. Aggiungi un tecnico dalla pagina Team tecnico.")}
                    />
                </Card>
            ) : !hasColumns ? (
                <Card>
                    <EmptyState
                        title={t("Nessuna abilitazione o competenza definita")}
                        description={canManageTypes ? t("Aggiungi le competenze con il pulsante «Gestisci competenze»; le abilitazioni si gestiscono da Team tecnico.") : t("Chiedi a un responsabile di definire le competenze.")}
                    />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-max min-w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th scope="col" rowSpan={2} className="sticky left-0 z-20 min-w-[11rem] border-r bg-card px-3 py-2 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-muted-foreground print:static">
                                        {t("Tecnico")}
                                    </th>
                                    {qualificationTypes.length > 0 && (
                                        <th scope="colgroup" colSpan={qualificationTypes.length} className="border-r px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-foreground">
                                            {t("Abilitazioni")}
                                        </th>
                                    )}
                                    {skillTypes.length > 0 && (
                                        <th scope="colgroup" colSpan={skillTypes.length} className="px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-foreground">
                                            {t("Competenze")}
                                        </th>
                                    )}
                                </tr>
                                <tr className="border-b bg-muted/40">
                                    {qualificationTypes.map((q, i) => (
                                        <th key={q.id} scope="col" title={q.name} className={cn("w-[7.5rem] min-w-[7.5rem] px-1.5 py-2 text-center align-bottom text-xs font-medium leading-tight", i === qualificationTypes.length - 1 && "border-r")}>
                                            <span className="line-clamp-3 break-words">{q.name}</span>
                                        </th>
                                    ))}
                                    {skillTypes.map(s => (
                                        <th key={s.id} scope="col" title={s.name} className="w-11 min-w-11 px-0.5 py-2 text-center align-bottom text-xs font-medium">
                                            <span className="mx-auto inline-block max-h-40 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180">{s.name}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 ? (
                                    <tr>
                                        <td colSpan={1 + qualificationTypes.length + skillTypes.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            {t("Nessun tecnico corrisponde ai filtri.")}
                                        </td>
                                    </tr>
                                ) : visible.map(t => (
                                    <tr key={t.id} className="border-b last:border-b-0 hover:bg-muted/20">
                                        <th scope="row" className="sticky left-0 z-10 min-w-[11rem] border-r bg-card px-3 py-2 text-left font-normal print:static">
                                            <div className="font-semibold leading-tight">{t.name}</div>
                                            <div className="text-xs text-muted-foreground">{t.specialty}{showPlant && t.plantName ? ` · ${t.plantName}` : ""}</div>
                                        </th>
                                        {qualificationTypes.map((q, i) => {
                                            const e = qualMap.get(key(t.id, q.id));
                                            return (
                                                <td key={q.id} className={cn("border-l p-0 align-middle", i === 0 && "border-l-0", i === qualificationTypes.length - 1 && "border-r")}>
                                                    <QualificationCell
                                                        technician={t}
                                                        type={q}
                                                        present={e !== undefined}
                                                        expiresAt={e ?? null}
                                                        canEdit={canEdit}
                                                        now={now}
                                                        onSaved={(enabled, expiresAt) => applyQualification(t.id, q.id, enabled, expiresAt)}
                                                    />
                                                </td>
                                            );
                                        })}
                                        {skillTypes.map(s => (
                                            <td key={s.id} className="border-l p-0 align-middle">
                                                <SkillCell
                                                    technician={t}
                                                    skill={s}
                                                    level={levelOf(t.id, s.id)}
                                                    canEdit={canEdit}
                                                    onSaved={(level) => applyLevel(t.id, s.id, level)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 bg-muted/40">
                                    <th scope="row" className="sticky left-0 z-10 min-w-[11rem] border-r bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground print:static">
                                        {t("Copertura")}
                                    </th>
                                    {qualificationTypes.map((q, i) => {
                                        const n = qualCoverage(q.id);
                                        return (
                                            <td key={q.id} className={cn("px-1 py-2 text-center text-sm font-bold", n === 0 ? "text-critical-strong" : "text-foreground", i === qualificationTypes.length - 1 && "border-r")}>
                                                <span title={t("{count} persone con abilitazione valida", { count: n })}>{n}</span>
                                            </td>
                                        );
                                    })}
                                    {skillTypes.map(s => {
                                        const n = skillCoverage(s.id);
                                        return (
                                            <td key={s.id} className={cn("border-l px-1 py-2 text-center text-sm font-bold", n === 0 ? "text-critical-strong" : "text-foreground")}>
                                                <span title={t("{count} persone con livello {level} ({label}) o superiore", { count: n, level: DEFAULT_MIN_LEVEL, label: t(SKILL_LEVEL_LABEL[DEFAULT_MIN_LEVEL]) })}>{n}</span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}

            {technicians.length > 0 && hasColumns && (
                <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                        <span className="font-semibold text-foreground">{t("Livelli:")} </span>
                        {([1, 2, 3, 4] as SkillLevel[]).map(l => `${l} ${t(SKILL_LEVEL_LABEL[l])}`).join(" · ")}.
                        {" "}{t("Un trattino significa nessuna competenza.")}
                    </p>
                    <p>
                        <span className="font-semibold text-foreground">{t("Copertura:")} </span>
                        {visible.length !== technicians.length
                            ? t("persone con abilitazione valida (non scaduta) o con livello {level} ({label}) o superiore, su tutti i {count} tecnici (qui ne vedi {visible}).", { level: DEFAULT_MIN_LEVEL, label: t(SKILL_LEVEL_LABEL[DEFAULT_MIN_LEVEL]), count: technicians.length, visible: visible.length })
                            : t("persone con abilitazione valida (non scaduta) o con livello {level} ({label}) o superiore, su tutti i {count} tecnici.", { level: DEFAULT_MIN_LEVEL, label: t(SKILL_LEVEL_LABEL[DEFAULT_MIN_LEVEL]), count: technicians.length })}
                    </p>
                    {canEdit && <p className="print:hidden">{t("Clicca su una cella per modificarla.")}</p>}
                </div>
            )}
        </div>
    );
}
