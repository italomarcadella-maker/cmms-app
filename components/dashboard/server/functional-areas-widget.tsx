
import { getAreaStatus } from "@/lib/dashboard-actions";
import { AreaCard } from "@/components/dashboard/area-card";
import { Factory, Wrench, Settings, TrendingUp } from "lucide-react";

export async function FunctionalAreasWidget() {
    const status = await getAreaStatus();

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AreaCard
                title="Linee Produttive"
                count={status.production}
                icon={Factory}
                href="/assets?type=line"
                color="bg-blue-500"
            />
            <AreaCard
                title="Impianti Generali"
                count={status.facilities}
                icon={Settings}
                href="/assets?type=facility"
                color="bg-slate-500"
            />
            <AreaCard
                title="Officina"
                count={status.workshop}
                icon={Wrench}
                href="/assets?location=officina"
                color="bg-amber-500"
            />
            <AreaCard
                title="Miglioramento"
                count={status.improvement}
                icon={TrendingUp}
                href="/work-orders?category=improvement"
                color="bg-emerald-500"
            />
        </div>
    );
}
