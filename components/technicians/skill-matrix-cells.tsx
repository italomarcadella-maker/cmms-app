"use client";

import { useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
import { AlertTriangle, Check, Clock, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { setQualificationCell, setSkillLevel } from "@/modules/maintenance/adapters/actions/skill-matrix-actions";
import { qualificationState, type QualificationState } from "@/modules/maintenance/domain/qualifications";
import { SKILL_LEVELS, skillLevelLabel, type SkillLevel } from "@/modules/maintenance/domain/skill-matrix";

/** aaaa-mm-gg dalla data salvata (mezzogiorno locale): si usano i componenti locali per non scivolare di giorno. */
export function dayKey(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** aaaa-mm-gg -> ISO del mezzogiorno locale di quel giorno (come lo salva il server). */
export function dayToIso(key: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0).toISOString();
}

/** Data in italiano: serve all'export CSV, che resta invariato in tutte le lingue. */
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("it-IT");

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Testo breve e stato di un'abilitazione presente nella cella.
 * Senza `tr` e `dateText` i testi escono in italiano (basta per leggere lo stato, come nell'export CSV).
 */
export function qualificationCellInfo(
    expiresAt: string | null,
    now: Date,
    tr: Translate = (key, params) => key.replace(/\{(\w+)\}/g, (m, k: string) => (params && k in params ? String(params[k]) : m)),
    dateText: (iso: string) => string = fmtDate,
): { state: QualificationState; label: string; detail: string | null } {
    const date = expiresAt ? new Date(expiresAt) : null;
    const state = qualificationState(date, now);
    switch (state) {
        case "EXPIRED": return { state, label: tr("Scaduta"), detail: tr("il {date}", { date: dateText(expiresAt!) }) };
        case "EXPIRING": return { state, label: tr("Scade il {date}", { date: dateText(expiresAt!) }), detail: null };
        case "VALID": return { state, label: tr("Valida"), detail: tr("fino al {date}", { date: dateText(expiresAt!) }) };
        default: return { state, label: tr("Valida"), detail: tr("senza scadenza") };
    }
}

const QUAL_TONE: Record<QualificationState, string> = {
    NO_EXPIRY: "bg-success-soft text-success-strong",
    VALID: "bg-success-soft text-success-strong",
    EXPIRING: "bg-warning-soft text-warning-strong",
    EXPIRED: "bg-critical-soft text-critical-strong",
};

const CELL_BASE = "flex h-full min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 text-center text-xs leading-tight";
const CELL_EDITABLE = "cursor-pointer transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

// --- Abilitazione ---

export function QualificationCell({ technician, type, expiresAt, present, canEdit, now, onSaved }: {
    technician: { id: string; name: string };
    type: { id: string; name: string };
    /** ISO della scadenza, null = senza scadenza (solo se `present`). */
    expiresAt: string | null;
    present: boolean;
    canEdit: boolean;
    now: Date;
    onSaved: (enabled: boolean, expiresAt: string | null) => void;
}) {
    const t = useT();
    const f = useFormat();
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(present);
    const [date, setDate] = useState(dayKey(expiresAt));
    const [busy, setBusy] = useState(false);

    const info = present ? qualificationCellInfo(expiresAt, now, t, (iso) => f.date(iso)) : null;
    const Icon = info?.state === "EXPIRED" ? AlertTriangle : info?.state === "EXPIRING" ? Clock : Check;
    const text = info ? `${info.label}${info.detail ? ` ${info.detail}` : ""}` : t("non abilitato");
    const ariaLabel = t("{technician}, {type}: {text}", { technician: technician.name, type: type.name, text });

    const content = info ? (
        <>
            <span className="inline-flex items-center gap-1 font-semibold"><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />{info.label}</span>
            {info.detail && <span className="text-[10px] font-normal opacity-90">{info.detail}</span>}
        </>
    ) : (
        <span className="text-muted-foreground" aria-hidden>-</span>
    );
    const tone = info ? QUAL_TONE[info.state] : "";

    if (!canEdit) {
        return <div className={cn(CELL_BASE, tone)} title={ariaLabel} aria-label={ariaLabel} role="img">{content}</div>;
    }

    const save = async () => {
        if (enabled && date && !dayToIso(date)) { toast.error("Data di scadenza non valida."); return; }
        setBusy(true);
        const res = await setQualificationCell(technician.id, type.id, enabled, enabled && date ? date : null);
        setBusy(false);
        if (res.success) {
            onSaved(enabled, enabled && date ? dayToIso(date) : null);
            toast.success(res.message);
            setOpen(false);
        } else toast.error(res.message);
    };

    return (
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setEnabled(present); setDate(dayKey(expiresAt)); } }}>
            <PopoverTrigger asChild>
                <button type="button" className={cn(CELL_BASE, CELL_EDITABLE, tone)} title={ariaLabel} aria-label={ariaLabel}>{content}</button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3" align="center">
                <div>
                    <p className="text-sm font-semibold">{type.name}</p>
                    <p className="text-xs text-muted-foreground">{technician.name}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`qc-on-${technician.id}-${type.id}`}>{t("Abilitato")}</Label>
                    <Switch id={`qc-on-${technician.id}-${type.id}`} checked={enabled} onCheckedChange={setEnabled} />
                </div>
                {enabled && (
                    <div className="grid gap-1.5">
                        <Label htmlFor={`qc-date-${technician.id}-${type.id}`} className="text-xs">{t("Scadenza (facoltativa)")}</Label>
                        <Input id={`qc-date-${technician.id}-${type.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                )}
                <Button type="button" size="sm" className="w-full" onClick={save} disabled={busy}>{busy ? t("Salvataggio...") : t("Salva")}</Button>
            </PopoverContent>
        </Popover>
    );
}

// --- Competenza ---

// Intensita' crescente dello stesso colore; il numero resta sempre visibile (non solo il colore).
const LEVEL_TONE: Record<SkillLevel, string> = {
    0: "text-muted-foreground",
    1: "bg-success/15 text-foreground",
    2: "bg-success/35 text-foreground",
    3: "bg-success/60 text-success-foreground",
    4: "bg-success text-success-foreground",
};

export function SkillCell({ technician, skill, level, canEdit, onSaved }: {
    technician: { id: string; name: string };
    skill: { id: string; name: string };
    level: number;
    canEdit: boolean;
    onSaved: (level: SkillLevel) => void;
}) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const current = (SKILL_LEVELS.includes(level as SkillLevel) ? level : 0) as SkillLevel;
    const ariaLabel = t("{technician}, {skill}: {text}", {
        technician: technician.name,
        skill: skill.name,
        text: current === 0 ? t("nessuna competenza") : t("livello {level}, {label}", { level: current, label: t(skillLevelLabel(current)) }),
    });

    const content = current === 0 ? (
        <span aria-hidden>-</span>
    ) : (
        <span className="inline-flex items-center gap-0.5 text-sm font-bold">
            {current}
            {current === 4 && <GraduationCap className="h-3.5 w-3.5" aria-hidden />}
        </span>
    );
    const base = cn(CELL_BASE, "min-h-[2.75rem]", LEVEL_TONE[current]);

    if (!canEdit) {
        return <div className={base} title={ariaLabel} aria-label={ariaLabel} role="img">{content}</div>;
    }

    const choose = async (next: SkillLevel) => {
        if (next === current) { setOpen(false); return; }
        setBusy(true);
        const res = await setSkillLevel(technician.id, skill.id, next);
        setBusy(false);
        if (res.success) { onSaved(next); setOpen(false); } else toast.error(res.message);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button type="button" className={cn(base, CELL_EDITABLE)} title={ariaLabel} aria-label={ariaLabel}>{content}</button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="center">
                <div className="px-2 pb-2 pt-1">
                    <p className="text-sm font-semibold">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">{technician.name}</p>
                </div>
                <div className="grid gap-1" role="group" aria-label={t("Livello di competenza")}>
                    {SKILL_LEVELS.map(l => (
                        <button
                            key={l}
                            type="button"
                            disabled={busy}
                            aria-pressed={l === current}
                            onClick={() => choose(l)}
                            className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                                l === current && "bg-muted font-semibold",
                            )}
                        >
                            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold", LEVEL_TONE[l], l === 0 && "border")}>{l === 0 ? "-" : l}</span>
                            <span className="flex-1">{t(skillLevelLabel(l))}</span>
                            {l === current && <Check className="h-4 w-4" aria-hidden />}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
