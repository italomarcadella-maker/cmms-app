"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { tk } from "@/lib/i18n/translate";
import { useT, useFormat } from "@/lib/i18n/client";
import { CalendarClock, ClipboardCheck, Cog, Gauge, HardHat, Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlant } from "@/lib/plant-context";
import { healthTone } from "@/components/ui/status-badge";
import { ImpiantoFormDialog } from "@/components/impianti/impianto-form-dialog";
import { ReadingEntryForm } from "@/components/energy/reading-entry-form";
import { ActivityStateBadge } from "@/components/contractors/state-badges";
import { frequencyLabel } from "@/modules/energy/domain/reading-plan";
import { meterTypeLabel, type ReadingState } from "@/modules/energy/domain/meter-types";
import {
    getImpiantiOverview, setMeterAsset,
    type Impianto, type ImpiantiOverview, type ImpiantoMeter, type RoundItem,
} from "@/modules/energy/adapters/actions/impianti-actions";

const STATE_BADGE: Record<ReadingState, { label: string; variant: "critical" | "warning" | "success" | "neutral" }> = {
    LATE: { label: tk("In ritardo"), variant: "critical" },
    TODAY: { label: tk("Da fare oggi"), variant: "warning" },
    OK: { label: tk("In programma"), variant: "success" },
    UNPLANNED: { label: tk("Non pianificata"), variant: "neutral" },
};

const HEALTH_BAR = { success: "bg-success", warning: "bg-warning", critical: "bg-critical" } as const;

export default function ImpiantiPage() {
    const t = useT();
    const fmt = useFormat();
    const { selected } = usePlant();
    const [version, setVersion] = useState(0);
    const [data, setData] = useState<ImpiantiOverview | null>(null);

    useEffect(() => {
        let alive = true;
        getImpiantiOverview().then(d => { if (alive) setData(d); });
        return () => { alive = false; };
    }, [version, selected]);

    const reload = () => setVersion(v => v + 1);
    const k = data?.kpis;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title={t("Impianti")}
                description={t("Aria compressa, elettrico, acqua e gli altri impianti tecnologici: stato, ordini, manutenzioni, ditte esterne e letture da fare, in un unico posto.")}
                actions={data?.canCreate && (
                    <ImpiantoFormDialog existingNames={data.impianti.map(i => i.name)} onSaved={reload} trigger={<Button><Plus className="h-4 w-4" /> {t("Nuovo impianto")}</Button>} />
                )}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("Impianti")} value={k?.impianti ?? "-"} icon={<Cog />} tone="info" href="/assets" />
                <StatCard label={t("Letture da fare")} value={k?.readingsDue ?? "-"} hint={t("in ritardo o di oggi")} icon={<Gauge />} tone={k && k.readingsDue > 0 ? "warning" : "success"} />
                <StatCard label={t("Ordini aperti")} value={k?.openOrders ?? "-"} hint={t("sugli impianti")} icon={<Wrench />} tone="info" href="/work-orders" />
                <StatCard label={t("Ditte in ritardo")} value={k?.contractorOverdue ?? "-"} hint={t("attività su impianti")} icon={<HardHat />} tone={k && k.contractorOverdue > 0 ? "critical" : "success"} href="/contractors" />
            </div>

            {data && (
                <section aria-label={t("Giro di letture")} className="space-y-2">
                    <h2 className="flex items-center gap-2 text-base font-semibold"><ClipboardCheck className="h-4 w-4 text-warning-strong" aria-hidden /> {t("Giro di letture")}</h2>
                    {data.round.length === 0 ? (
                        <Card><EmptyState icon={<Gauge />} title={t("Nessuna lettura da fare")} description={t("Pianifica le letture dei contatori dalla pagina Sostenibilità: le scadenze di oggi e in ritardo compaiono qui, con il campo per il valore.")} /></Card>
                    ) : (
                        <Card>
                            <CardContent className="divide-y p-0">
                                {data.round.map(m => <RoundRow key={m.id} item={m} onDone={reload} />)}
                            </CardContent>
                        </Card>
                    )}
                </section>
            )}

            <section aria-label={t("Impianti")} className="space-y-3">
                <h2 className="text-base font-semibold">{t("Gli impianti")}</h2>
                {data === null ? (
                    <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p>
                ) : data.impianti.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<Cog />}
                            title={t("Nessun impianto registrato")}
                            description={t("Crea il primo impianto (aria compressa, cabina elettrica, caldaia...) e aggiungi i suoi componenti. Le ditte a contratto e le letture si collegano poi dall'impianto.")}
                            action={data.canCreate
                                ? <ImpiantoFormDialog existingNames={[]} onSaved={reload} trigger={<Button><Plus className="h-4 w-4" /> {t("Nuovo impianto")}</Button>} />
                                : <p className="text-xs text-muted-foreground">{t("Chiedi a un responsabile di plant o a un amministratore di crearlo.")}</p>}
                        />
                    </Card>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {data.impianti.map(i => <ImpiantoCard key={i.key} impianto={i} onChanged={reload} canCreate={data.canCreate} existingNames={data.impianti.map(x => x.name)} />)}
                    </div>
                )}
            </section>

            {data && data.looseMeters.length > 0 && (
                <section aria-label={t("Contatori non collegati")} className="space-y-2">
                    <h2 className="text-base font-semibold">{t("Contatori non collegati a un impianto")}</h2>
                    <Card>
                        <CardContent className="divide-y p-0">
                            {data.looseMeters.map(m => (
                                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                                    <div>
                                        <p className="text-sm font-medium">{m.name}</p>
                                        <p className="text-xs text-muted-foreground">{t(meterTypeLabel(m.type))}{m.location ? ` · ${m.location}` : ""}{m.lastValue !== null ? ` · ${t("ultima: {value} {unit}", { value: fmt.number(m.lastValue), unit: m.unit })}` : ""}</p>
                                    </div>
                                    {data.canPlan && data.facilityAssets.length > 0 && (
                                        <LinkToImpianto meterId={m.id} assets={data.facilityAssets} onDone={reload} />
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>
            )}
        </div>
    );
}

function LinkToImpianto({ meterId, assets, onDone }: { meterId: string; assets: { id: string; name: string }[]; onDone: () => void }) {
    const t = useT();
    const link = async (assetId: string) => {
        const res = await setMeterAsset(meterId, assetId);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };
    return (
        <Select onValueChange={link}>
            <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue placeholder={t("Collega a un impianto...")} /></SelectTrigger>
            <SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
    );
}

function RoundRow({ item, onDone }: { item: RoundItem; onDone: () => void }) {
    const t = useT();
    const st = STATE_BADGE[item.state];
    return (
        <div className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={st.variant}>{t(st.label)}</Badge>
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                    {[item.impiantoName, t(meterTypeLabel(item.type)), item.location].filter(Boolean).join(" · ")}
                    {item.assigneeName ? ` · ${t("a cura di {name}", { name: item.assigneeName })}` : ""}
                </span>
            </div>
            <ReadingEntryForm meterId={item.id} unit={item.unit} lastValue={item.lastValue} lastReadAt={item.lastReadAt} onDone={onDone} />
        </div>
    );
}

function ImpiantoCard({ impianto: i, onChanged, canCreate, existingNames }: { impianto: Impianto; onChanged: () => void; canCreate: boolean; existingNames: string[] }) {
    const t = useT();
    const fmt = useFormat();
    const tone = healthTone(i.avgHealth);
    return (
        <Card>
            <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <p className="flex flex-wrap items-center gap-2 font-semibold">{i.name} <PlantBadge plantId={i.plantId} /></p>
                        <p className="text-xs text-muted-foreground">{i.assets.map(a => a.name).join(", ")}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {i.offline > 0 && <Badge variant="critical">{t("{n} fermo", { n: i.offline })}</Badge>}
                        {i.overdueOrders > 0 && <Badge variant="critical">{t("{n} in ritardo", { n: i.overdueOrders })}</Badge>}
                        {i.openOrders > 0 && <Badge variant="info">{t("{n} ordini aperti", { n: i.openOrders })}</Badge>}
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t("Salute")}</span><span className="font-medium tabular-nums">{i.avgHealth}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={t("Salute {pct}%", { pct: i.avgHealth })}>
                        <div className={`h-full rounded-full ${HEALTH_BAR[tone]}`} style={{ width: `${i.avgHealth}%` }} />
                    </div>
                </div>

                <dl className="grid gap-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                        <dt className="flex items-center gap-1.5 text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" aria-hidden /> {t("Prossima manutenzione")}</dt>
                        <dd className="text-right">{i.nextPm ? `${i.nextPm.title} · ${fmt.date(i.nextPm.date)}` : t("nessuna pianificata")}</dd>
                    </div>
                    {i.contractors.length > 0 ? i.contractors.map((c, idx) => (
                        <div key={idx} className="flex justify-between gap-3">
                            <dt className="flex items-center gap-1.5 text-muted-foreground"><HardHat className="h-3.5 w-3.5" aria-hidden /> {c.name}</dt>
                            <dd className="flex items-center gap-2 text-right">{c.activity} · {fmt.date(c.nextDue)} <ActivityStateBadge state={c.state} /></dd>
                        </div>
                    )) : (
                        <div className="flex justify-between gap-3">
                            <dt className="flex items-center gap-1.5 text-muted-foreground"><HardHat className="h-3.5 w-3.5" aria-hidden /> {t("Ditte esterne")}</dt>
                            <dd className="text-right text-muted-foreground">{t("nessuna attività a contratto")}</dd>
                        </div>
                    )}
                </dl>

                {i.meters.length > 0 ? (
                    <div className="space-y-2 border-t pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Letture")}</p>
                        {i.meters.map(m => <MeterLine key={m.id} meter={m} onDone={onChanged} />)}
                    </div>
                ) : (
                    <p className="border-t pt-3 text-xs text-muted-foreground">{t("Nessun contatore collegato: collegalo dalla lista «Contatori non collegati», o dalla pagina Sostenibilità.")}</p>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-3">
                    {i.assets.slice(0, 3).map(a => (
                        <Button key={a.id} asChild size="sm" variant="ghost"><Link href={`/assets/${a.id}`}>{a.name}</Link></Button>
                    ))}
                    {canCreate && (
                        <ImpiantoFormDialog existingNames={existingNames} defaultImpianto={i.name} onSaved={onChanged} trigger={<Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> {t("Componente")}</Button>} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function MeterLine({ meter: m, onDone }: { meter: ImpiantoMeter; onDone: () => void }) {
    const t = useT();
    const fmt = useFormat();
    const [open, setOpen] = useState(false);
    const st = STATE_BADGE[m.state];
    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground"> · {t(meterTypeLabel(m.type))}{m.lastValue !== null ? ` · ${fmt.number(m.lastValue)} ${m.unit} (${fmt.date(m.lastReadAt)})` : ` · ${t("nessuna lettura")}`}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={st.variant}>{t(st.label)}{m.state === "OK" && m.nextDue ? ` ${fmt.date(m.nextDue)}` : ""}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>{open ? t("Chiudi") : t("Registra")}</Button>
                </div>
            </div>
            {m.frequencyDays && <p className="text-xs text-muted-foreground">{t(frequencyLabel(m.frequencyDays))}{m.assigneeName ? ` · ${t("a cura di {name}", { name: m.assigneeName })}` : ""}</p>}
            {open && <ReadingEntryForm meterId={m.id} unit={m.unit} lastValue={m.lastValue} lastReadAt={m.lastReadAt} onDone={() => { setOpen(false); onDone(); }} />}
        </div>
    );
}
