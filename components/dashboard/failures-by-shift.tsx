"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { usePlant } from "@/lib/plant-context";
import { useT } from "@/lib/i18n/client";
import { SHIFTS } from "@/modules/maintenance/domain/shifts";
import { getFailuresByDepartmentShift, type FailuresByShift } from "@/modules/maintenance/adapters/actions/dashboard-widgets-actions";

type Period = "7" | "30" | "90";

const shiftHours = (from: number, to: number) => `${String(from).padStart(2, "0")}-${String(to).padStart(2, "0")}`;

/** Mappa di calore: guasti per reparto e per turno nel periodo scelto. */
export function FailuresByShiftCard() {
    const t = useT();
    const { selected } = usePlant();
    const [period, setPeriod] = useState<Period>("30");
    const [result, setResult] = useState<FailuresByShift | null>(null);

    useEffect(() => {
        let alive = true;
        getFailuresByDepartmentShift(Number(period)).then(r => { if (alive) setResult(r); });
        return () => { alive = false; };
    }, [period, selected]);

    const loading = !result || result.days !== Number(period);
    const max = result ? Math.max(1, ...result.rows.flatMap(r => SHIFTS.map(s => r.shifts[s.id]))) : 1;

    return (
        <Card className="flex h-full flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-primary" aria-hidden /> {t("Guasti per reparto e turno")}</h3>
                <SegmentedControl
                    aria-label={t("Periodo")}
                    value={period}
                    onChange={setPeriod}
                    options={[{ value: "7", label: t("7 gg") }, { value: "30", label: t("30 gg") }, { value: "90", label: t("90 gg") }]}
                />
            </div>

            {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("Caricamento...")}</p>
            ) : result.rows.length === 0 ? (
                <EmptyState icon={<Clock3 />} title={t("Nessun guasto nel periodo")} description={t("Qui compaiono gli ordini di tipo guasto, divisi per reparto della macchina e turno.")} />
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[420px] text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground">
                                    <th className="py-1 pr-2 text-left font-medium">{t("Reparto")}</th>
                                    {SHIFTS.map(s => (
                                        <th key={s.id} className="px-1 py-1 text-center font-medium">
                                            {t(s.label)}<span className="block text-[10px] font-normal">{shiftHours(s.from, s.to)}</span>
                                        </th>
                                    ))}
                                    <th className="px-1 py-1 text-right font-medium">{t("Totale")}</th>
                                    <th className="py-1 pl-2 text-right font-medium">{t("Fermo")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.rows.map(r => (
                                    <tr key={r.department} className="border-t">
                                        <td className="max-w-[150px] truncate py-1.5 pr-2 font-medium" title={r.department}>{r.department}</td>
                                        {SHIFTS.map(s => {
                                            const n = r.shifts[s.id];
                                            return (
                                                <td key={s.id} className="p-1 text-center">
                                                    <span
                                                        className="inline-flex h-8 w-full min-w-[44px] items-center justify-center rounded-md text-sm font-medium tabular-nums"
                                                        style={{ background: n > 0 ? `color-mix(in srgb, var(--info) ${Math.round(18 + (n / max) * 62)}%, transparent)` : "var(--muted)" }}
                                                    >
                                                        {n}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="px-1 text-right font-semibold tabular-nums">{r.total}</td>
                                        <td className="pl-2 text-right text-xs tabular-nums text-muted-foreground">{r.downtimeMin > 0 ? t("{n} min", { n: r.downtimeMin }) : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t text-xs text-muted-foreground">
                                    <td className="py-1.5 pr-2">{t("Totale")}</td>
                                    {SHIFTS.map(s => <td key={s.id} className="px-1 text-center tabular-nums">{result.totals[s.id]}</td>)}
                                    <td className="px-1 text-right font-semibold tabular-nums text-foreground">{result.totalFaults}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t("Il turno è quello in cui è iniziato il guasto (ora del fermo registrato, altrimenti apertura dell'ordine), fuso {timezone}.", { timezone: result.timezone })}
                        {result.withoutDepartment > 0 && ` ${t("{n} guasti riguardano macchine senza reparto: indicalo nell'anagrafica.", { n: result.withoutDepartment })}`}
                    </p>
                </>
            )}
        </Card>
    );
}
