"use client";

import { useEffect, useMemo, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNow } from "@/lib/use-now";
import { useT, useFormat } from "@/lib/i18n/client";
import { RecordSafetyEventDialog } from "@/components/dashboard/record-safety-event-dialog";
import type { SafetyCounter } from "@/modules/maintenance/adapters/actions/safety-actions";

const pad = (n: number) => String(n).padStart(2, "0");

/** Cronografo dei giorni senza infortuni: la lancetta gira, il contatore avanza di secondo in secondo. */
export function InjuryCounter({ data }: { data: SafetyCounter }) {
    const t = useT();
    const fmt = useFormat();
    const now = useNow();
    const handRef = useRef<SVGLineElement>(null);

    // La lancetta compie un giro al minuto con un'animazione CSS: qui si fa solo partire dal secondo giusto
    useEffect(() => {
        const d = new Date();
        handRef.current?.style.setProperty("--chrono-offset", String(d.getSeconds() + d.getMilliseconds() / 1000));
    }, []);

    const ticks = useMemo(
        () => Array.from({ length: 60 }, (_, i) => {
            const a = (i * 6 * Math.PI) / 180;
            const r1 = i % 5 ? 66 : 61;
            return { x1: 80 + r1 * Math.sin(a), y1: 80 - r1 * Math.cos(a), x2: 80 + 70 * Math.sin(a), y2: 80 - 70 * Math.cos(a), major: i % 5 === 0 };
        }),
        []
    );

    const last = data.lastInjuryAt ? new Date(data.lastInjuryAt).getTime() : null;
    const elapsed = last && now ? Math.max(0, now - last) : null;
    const days = elapsed !== null ? Math.floor(elapsed / 86_400_000) : null;
    const hms = elapsed !== null ? `${pad(Math.floor((elapsed % 86_400_000) / 3_600_000))}:${pad(Math.floor((elapsed % 3_600_000) / 60_000))}:${pad(Math.floor((elapsed % 60_000) / 1000))}` : "";

    return (
        <Card className="flex h-full flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-success-strong" aria-hidden /> {t("Giorni senza infortuni")}</h3>
                {data.canRecord && <RecordSafetyEventDialog data={data} />}
            </div>

            {data.lastInjuryAt ? (
                <div className="flex flex-1 flex-col items-center gap-3 sm:flex-row sm:items-center">
                    <svg viewBox="0 0 160 160" className="w-full max-w-[170px] shrink-0" role="img" aria-label={`${t("Giorni senza infortuni")}: ${days ?? ""}`}>
                        <circle cx="80" cy="80" r="74" fill="none" stroke="var(--border)" strokeWidth="1" />
                        {ticks.map((t, i) => (
                            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? "var(--muted-foreground)" : "var(--border)"} strokeWidth={t.major ? 1.5 : 1} />
                        ))}
                        <line ref={handRef} className="chrono-hand" x1="80" y1="80" x2="80" y2="20" stroke="var(--critical)" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="80" cy="80" r="4" fill="var(--critical)" />
                        <text x="80" y="66" textAnchor="middle" fontSize="38" fontWeight="500" fill="var(--foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {days ?? "—"}
                        </text>
                        <text x="80" y="108" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {hms}
                        </text>
                    </svg>
                    <div className="min-w-0 flex-1 space-y-2 text-sm">
                        <p className="text-muted-foreground">
                            {t("Dall'ultimo infortunio, il {date}.", { date: fmt.date(data.lastInjuryAt) })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {data.recordDays !== null && <Badge variant="success">{t("Record: {n} giorni", { n: data.recordDays })}</Badge>}
                            <Badge variant={data.nearMissLast30d > 0 ? "warning" : "neutral"}>{t("Quasi incidenti (30 gg): {n}", { n: data.nearMissLast30d })}</Badge>
                        </div>
                        {data.perPlant.length > 1 && (
                            <ul className="space-y-1 pt-1 text-xs text-muted-foreground">
                                {data.perPlant.map(p => (
                                    <li key={p.plantId} className="flex justify-between gap-2">
                                        <span className="truncate">{p.plantName}</span>
                                        <span className="tabular-nums text-foreground">{p.daysSince !== null ? t("{n} giorni", { n: p.daysSince }) : t("non registrato")}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                    <p className="text-sm font-medium">{t("Nessun infortunio registrato")}</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                        {t("Il contatore parte dalla data dell'ultimo infortunio.")} {data.canRecord ? t("Registrala per avviarlo.") : t("Chiedi al responsabile di registrarla.")}
                    </p>
                </div>
            )}
        </Card>
    );
}
