
import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/server/dashboard-header";
import { StatsGrid } from "@/components/dashboard/server/stats-grid";
import { WeeklyTrends } from "@/components/dashboard/server/weekly-trends";
import { RecentActivity } from "@/components/dashboard/server/recent-activity";
import { OverdueAlerts } from "@/components/dashboard/server/overdue-alerts";
import { SafetyStatus } from "@/components/dashboard/server/safety-status";
import { AIInsightsWrapper } from "@/components/dashboard/server/ai-insights-wrapper";
import { FactoryMapWrapper } from "@/components/dashboard/server/factory-map-wrapper";
import { AnalyticsWrapper } from "@/components/dashboard/server/analytics-wrapper";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { MetricCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <Suspense fallback={<div className="h-20 bg-muted/20 animate-pulse rounded-lg" />}>
        <DashboardHeader />
      </Suspense>

      {/* Safety & Insights */}
      <Suspense fallback={<div className="h-32 bg-muted/20 animate-pulse rounded-lg" />}>
        <SafetyStatus />
      </Suspense>

      <Suspense fallback={<div className="h-32 bg-muted/20 animate-pulse rounded-lg mt-4" />}>
        <AIInsightsWrapper />
      </Suspense>

      {/* Map */}
      <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
        <FactoryMapWrapper />
      </Suspense>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        }>
          <StatsGrid />
        </Suspense>
      </div>

      {/* Analytics */}
      <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
        <AnalyticsWrapper />
      </Suspense>

      {/* Bottom Section */}
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8 space-y-6">
          <Suspense fallback={<div className="h-[300px] bg-muted/20 animate-pulse rounded-lg" />}>
            <WeeklyTrends />
          </Suspense>

          <Suspense fallback={<div className="h-[400px] bg-muted/20 animate-pulse rounded-lg" />}>
            <RecentActivity />
          </Suspense>
        </div>

        <div className="md:col-span-4 space-y-6">
          <Suspense fallback={<div className="h-40 bg-muted/20 animate-pulse rounded-lg" />}>
            <OverdueAlerts />
          </Suspense>

          <QuickActions />
        </div>
      </div>

    </div>
  );
}
