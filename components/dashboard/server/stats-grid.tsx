import { getDetailedDashboardStats } from "@/lib/dashboard-actions";
import { StatCard } from "@/components/ui/stat-card";
import { healthTone } from "@/components/ui/status-badge";
import { Activity, AlertTriangle, ClipboardList, Package } from "lucide-react";

export async function StatsGrid() {
    const stats = await getDetailedDashboardStats();

    return (
        <>
            <StatCard
                label="Salute impianti"
                value={`${stats.avgHealth}%`}
                hint="Media su tutti gli asset"
                icon={<Activity />}
                tone={healthTone(stats.avgHealth)}
                href="/assets"
            />
            <StatCard
                label="Ordini aperti"
                value={stats.openWorkOrders}
                hint={`${stats.highPriorityOpen} ad alta priorità`}
                icon={<ClipboardList />}
                tone={stats.highPriorityOpen > 3 ? "critical" : "info"}
                href="/work-orders"
            />
            <StatCard
                label="Scadenze critiche"
                value={stats.overdueWorkOrders}
                hint="Ordini in ritardo"
                icon={<AlertTriangle />}
                tone={stats.overdueWorkOrders > 0 ? "critical" : "success"}
                trend={stats.overdueWorkOrders === 0 ? { label: "Tutto in orario", direction: "flat", good: true } : undefined}
                href="/work-orders"
            />
            <StatCard
                label="Materiali sottoscorta"
                value={stats.lowStockCount}
                hint="Articoli da riordinare"
                icon={<Package />}
                tone={stats.lowStockCount > 0 ? "warning" : "success"}
                href="/inventory"
            />
        </>
    );
}
