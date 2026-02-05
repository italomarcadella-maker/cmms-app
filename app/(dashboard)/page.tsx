import { Suspense } from "react";
import { MetricCardSkeleton } from "@/components/ui/skeleton";
import { getDetailedDashboardStats, getWorkOrderTrends, getRecentWorkOrders, getOverdueWorkOrders, getHighPrioritySafetyRequests, getMaintenanceMetrics } from "@/lib/dashboard-actions";
import { getTechnicians } from "@/lib/actions";
import { getDailyInsights } from "@/lib/ai-service";
import { DashboardUI } from "@/components/dashboard/dashboard-ui";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [stats, trends, recentWOs, overdueWOs, dailyInsights, safetyRequests, technicians, assets, metrics] = await Promise.all([
    getDetailedDashboardStats(),
    getWorkOrderTrends(7),
    getRecentWorkOrders(5),
    getOverdueWorkOrders(10),
    getDailyInsights(),
    getHighPrioritySafetyRequests(5),
    getTechnicians(),
    import("@/lib/actions").then(mod => mod.getAssets()),
    getMaintenanceMetrics()
  ]);

  return (
    <Suspense fallback={<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></div>}>
      <DashboardUI
        stats={stats}
        trends={trends}
        recentWOs={recentWOs}
        overdueWOs={overdueWOs}
        dailyInsights={dailyInsights}
        safetyRequests={safetyRequests}
        technicians={technicians}
        assets={assets}
        metrics={metrics}
      />
    </Suspense>
  );
}
