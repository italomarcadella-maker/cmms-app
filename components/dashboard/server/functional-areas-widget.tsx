import { getAreaStatus } from "@/lib/dashboard-actions";
import { getEnergyMetrics } from "@/lib/energy-actions";
import { AreaCard } from "@/components/dashboard/area-card";
import { Factory, Leaf, Settings, TrendingUp, Wrench } from "lucide-react";

export async function FunctionalAreasWidget() {
    const [status, energy] = await Promise.all([getAreaStatus(), getEnergyMetrics()]);

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <AreaCard
                title="Linee produttive"
                count={status.production}
                icon={<Factory />}
                href="/work-orders?hasLine=true"
                tone="info"
            />
            <AreaCard
                title="Impianti generali"
                count={status.facilities}
                icon={<Settings />}
                href="/work-orders?assetType=FACILITY"
                tone="neutral"
            />
            <AreaCard
                title="Officina"
                count={status.workshop}
                icon={<Wrench />}
                href="/work-orders?location=officina"
                tone="warning"
            />
            <AreaCard
                title="Miglioramento"
                count={status.improvement}
                icon={<TrendingUp />}
                href="/work-orders?category=IMPROVEMENT"
                tone="success"
            />
            <AreaCard
                title="Sostenibilità"
                count={energy.sustainabilityScore ?? "N/D"}
                icon={<Leaf />}
                href="/sustainability"
                tone="success"
                subtitle="Eco score"
            />
        </div>
    );
}
