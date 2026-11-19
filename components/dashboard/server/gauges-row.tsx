import { getAssetAvailability, getDetailedDashboardStats } from "@/lib/dashboard-actions";
import { GaugeCard } from "@/components/dashboard/gauge-card";
import { healthTone } from "@/components/ui/status-badge";

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** I quattro indicatori principali, come quadranti. L'arco mostra una quota reale, mai un valore inventato. */
export async function GaugesRow() {
    const [s, av] = await Promise.all([getDetailedDashboardStats(), getAssetAvailability()]);
    const availablePct = av.inUse > 0 ? Math.round(((av.inUse - av.stopped) / av.inUse) * 100) : 0;

    return (
        <>
            <GaugeCard
                label="Macchine operative"
                display={av.inUse > 0 ? `${availablePct}%` : "-"}
                percent={availablePct}
                hint={av.inUse === 0 ? "nessuna macchina registrata" : av.stopped === 0 ? `nessuna ferma su ${av.inUse}` : `${av.stopped} ferme su ${av.inUse} macchine`}
                tone={av.stopped === 0 ? "success" : healthTone(availablePct)}
                href="/assets"
            />
            <GaugeCard
                label="Ordini aperti"
                display={String(s.openWorkOrders)}
                percent={pct(s.openWorkOrders, s.totalWorkOrders)}
                hint={`${s.highPriorityOpen} ad alta priorità · su ${s.totalWorkOrders} totali`}
                tone={s.highPriorityOpen > 3 ? "critical" : "info"}
                href="/work-orders"
            />
            <GaugeCard
                label="In ritardo"
                display={String(s.overdueWorkOrders)}
                percent={pct(s.overdueWorkOrders, s.openWorkOrders)}
                hint={s.overdueWorkOrders === 0 ? "tutto in orario" : `su ${s.openWorkOrders} ordini aperti`}
                tone={s.overdueWorkOrders > 0 ? "critical" : "success"}
                href="/work-orders"
            />
            <GaugeCard
                label="Sotto scorta"
                display={String(s.lowStockCount)}
                percent={pct(s.lowStockCount, s.totalSpareParts)}
                hint={`su ${s.totalSpareParts} articoli`}
                tone={s.lowStockCount > 0 ? "warning" : "success"}
                href="/inventory"
            />
        </>
    );
}
