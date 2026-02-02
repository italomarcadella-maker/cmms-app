import { Suspense } from "react";
import { MetricCardSkeleton } from "@/components/ui/skeleton";
import { getDetailedDashboardStats, getWorkOrderTrends, getRecentWorkOrders, getOverdueWorkOrders } from "@/lib/dashboard-actions";
import { getDailyInsights } from "@/lib/ai-service";
import { DashboardUI } from "@/components/dashboard/dashboard-ui";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [stats, trends, recentWOs, overdueWOs, dailyInsights] = await Promise.all([
    getDetailedDashboardStats(),
    getWorkOrderTrends(7),
    getRecentWorkOrders(5),
    getOverdueWorkOrders(10),
    getDailyInsights()
  ]);

  return (
    <Suspense fallback={<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></div>}>
      <DashboardUI
        stats={stats}
        trends={trends}
        recentWOs={recentWOs}
        overdueWOs={overdueWOs}
        dailyInsights={dailyInsights}
      />
    </Suspense>
  );
}
