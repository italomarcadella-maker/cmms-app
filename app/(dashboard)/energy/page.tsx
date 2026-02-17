import { getMeters, getEnergyStats } from "@/lib/actions";
import { EnergyDashboard } from "@/components/energy/energy-dashboard";

export default async function EnergyPage() {
    const meters = await getMeters();
    const stats = await getEnergyStats();

    return (
        <div className="flex flex-col gap-4">
            <EnergyDashboard stats={stats} meters={meters} />
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg m-4 border border-red-500">
                <h3 className="font-bold text-red-500 mb-2">DEBUG CORE DATA</h3>
                <pre className="text-xs overflow-auto max-h-60">
                    {JSON.stringify({
                        readingsCount: stats.trends.length,
                        firstTrend: stats.trends[0],
                        lastTrend: stats.trends[stats.trends.length - 1],
                        totals: stats.currentMonth
                    }, null, 2)}
                </pre>
            </div>
        </div>
    );
}
