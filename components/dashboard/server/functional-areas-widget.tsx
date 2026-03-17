
import { getAreaStatus } from "@/lib/dashboard-actions";
import { getEnergyMetrics } from "@/lib/energy-actions";
import { AreaCard } from "@/components/dashboard/area-card";
import { Factory, Wrench, Settings, TrendingUp } from "lucide-react";

export async function FunctionalAreasWidget() {
    const status = await getAreaStatus();

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <AreaCard
                title="Linee Produttive"
                count={status.production}
                icon={<Factory className="h-5 w-5" />}
                href="/work-orders?hasLine=true"
                color="bg-blue-500"
            />
            <AreaCard
                title="Impianti Generali"
                count={status.facilities}
                icon={<Settings className="h-5 w-5" />}
                href="/work-orders?assetType=FACILITY"
                color="bg-slate-500"
            />
            <AreaCard
                title="Officina"
                count={status.workshop}
                icon={<Wrench className="h-5 w-5" />}
                href="/work-orders?location=officina"
                color="bg-amber-500"
            />
            <AreaCard
                title="Miglioramento"
                count={status.improvement}
                icon={<TrendingUp className="h-5 w-5" />}
                href="/work-orders?category=IMPROVEMENT"
                color="bg-emerald-500"
            />
            <AreaCard
                title="Sostenibilità AI"
                count={(await getEnergyMetrics()).sustainabilityScore}
                icon={<TrendingUp className="h-5 w-5" />}
                href="/sustainability"
                color="bg-indigo-600"
            />
        </div>
    );
}
