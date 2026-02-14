
import { getDetailedDashboardStats } from "@/lib/dashboard-actions";
import { MetricCard } from "@/components/dashboard/metric-card"; // Need to extract this first or rewrite
import { Activity, ClipboardList, AlertTriangle, Package } from "lucide-react";

export async function StatsGrid() {
    const stats = await getDetailedDashboardStats();

    return (
        <>
            <MetricCard
                title="Salute Impianto"
                value={`${stats.avgHealth}%`}
                icon={Activity}
                subtext="Media score globale"
                color="text-emerald-500"
            />
            <MetricCard
                title="Materiali Sottoscorta"
                value={stats.lowStockCount.toString()}
                icon={Package}
                subtext="Articoli da ordinare"
                color={stats.lowStockCount > 0 ? "text-red-500" : "text-emerald-500"}
                alert={stats.lowStockCount > 0}
            />
            <MetricCard
                title="Ordini Aperti"
                value={stats.openWorkOrders.toString()}
                icon={ClipboardList}
                subtext={`${stats.highPriorityOpen} alta priorità`}
                color="text-amber-500"
                alert={stats.highPriorityOpen > 3}
            />
            <MetricCard
                title="Scadenze Critiche"
                value={stats.overdueWorkOrders.toString()}
                icon={AlertTriangle}
                subtext="Ordini ritardati"
                color={stats.overdueWorkOrders > 0 ? "text-red-500" : "text-emerald-500"}
                trend={stats.overdueWorkOrders === 0 ? "In orario" : "Attenzione"}
                trendUp={stats.overdueWorkOrders === 0}
                alert={stats.overdueWorkOrders > 0}
            />
        </>
    );
}
