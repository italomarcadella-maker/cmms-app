import { getAssetAvailability, getDetailedDashboardStats } from "@/lib/dashboard-actions";
import { GaugeCard } from "@/components/dashboard/gauge-card";
import { healthTone } from "@/components/ui/status-badge";
import { getT } from "@/lib/i18n/server";

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** I quattro indicatori principali, come quadranti. L'arco mostra una quota reale, mai un valore inventato. */
export async function GaugesRow() {
    const [s, av] = await Promise.all([getDetailedDashboardStats(), getAssetAvailability()]);
    const { t } = await getT();
    const availablePct = av.inUse > 0 ? Math.round(((av.inUse - av.stopped) / av.inUse) * 100) : 0;

    return (
        <>
            <GaugeCard
                label={t("Macchine operative")}
                display={av.inUse > 0 ? `${availablePct}%` : "-"}
                percent={availablePct}
                hint={av.inUse === 0 ? t("nessuna macchina registrata") : av.stopped === 0 ? t("nessuna ferma su {total}", { total: av.inUse }) : t("{stopped} ferme su {total} macchine", { stopped: av.stopped, total: av.inUse })}
                tone={av.stopped === 0 ? "success" : healthTone(availablePct)}
                href="/assets"
            />
            <GaugeCard
                label={t("Ordini aperti")}
                display={String(s.openWorkOrders)}
                percent={pct(s.openWorkOrders, s.totalWorkOrders)}
                hint={t("{high} ad alta priorità · su {total} totali", { high: s.highPriorityOpen, total: s.totalWorkOrders })}
                tone={s.highPriorityOpen > 3 ? "critical" : "info"}
                href="/work-orders"
            />
            <GaugeCard
                label={t("In ritardo")}
                display={String(s.overdueWorkOrders)}
                percent={pct(s.overdueWorkOrders, s.openWorkOrders)}
                hint={s.overdueWorkOrders === 0 ? t("tutto in orario") : t("su {total} ordini aperti", { total: s.openWorkOrders })}
                tone={s.overdueWorkOrders > 0 ? "critical" : "success"}
                href="/work-orders"
            />
            <GaugeCard
                label={t("Sotto scorta")}
                display={String(s.lowStockCount)}
                percent={pct(s.lowStockCount, s.totalSpareParts)}
                hint={t("su {total} articoli", { total: s.totalSpareParts })}
                tone={s.lowStockCount > 0 ? "warning" : "success"}
                href="/inventory"
            />
        </>
    );
}
