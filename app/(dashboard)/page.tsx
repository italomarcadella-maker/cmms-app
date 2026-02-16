
import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/server/dashboard-header";
import { StatsGrid } from "@/components/dashboard/server/stats-grid";
import { FunctionalAreasWidget } from "@/components/dashboard/server/functional-areas-widget";
import { UpcomingSchedule } from "@/components/dashboard/server/upcoming-schedule";
import { TechnicianAvailability } from "@/components/dashboard/server/technician-availability";
import { MetricCardSkeleton } from "@/components/ui/skeleton";
import { AIInsightsWrapper } from "@/components/dashboard/server/ai-insights-wrapper";
import { WeeklyTrends } from "@/components/dashboard/server/weekly-trends";
import { AnalyticsWrapper } from "@/components/dashboard/server/analytics-wrapper";
import { SafetyStatus } from "@/components/dashboard/server/safety-status";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <Suspense fallback={<div className="h-20 bg-muted/20 animate-pulse rounded-lg" />}>
        <DashboardHeader />
      </Suspense>

      {/* 1. Safety Alerts (Top Priority) */}
      <Suspense fallback={<div className="h-40 bg-muted/20 animate-pulse rounded-lg" />}>
        <SafetyStatus />
      </Suspense>

      {/* 2. AI Daily Briefing */}
      <Suspense fallback={<div className="h-32 bg-muted/20 animate-pulse rounded-lg" />}>
        <AIInsightsWrapper />
      </Suspense>

      {/* 3. Macro Areas */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Macro Aree</h2>
        <Suspense fallback={<div className="grid grid-cols-4 gap-4 h-32 bg-muted/20 animate-pulse rounded-lg" />}>
          <FunctionalAreasWidget />
        </Suspense>
      </section>

      {/* 4. Primary Metrics Grid (Health, Stock, Open WOs, Deadlines) */}
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

      {/* 5. Upcoming Schedule */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Programmazione</h2>
        <Suspense fallback={<div className="h-64 bg-muted/20 animate-pulse rounded-lg" />}>
          <UpcomingSchedule />
        </Suspense>
      </section>

      {/* 6. Weekly Trends */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Andamento Settimanale</h2>
        <Suspense fallback={<div className="h-[300px] bg-muted/20 animate-pulse rounded-lg" />}>
          <WeeklyTrends />
        </Suspense>
      </section>

      {/* 7. Analytics */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Analisi & Costi</h2>
        <Suspense fallback={<div className="h-[400px] bg-muted/20 animate-pulse rounded-lg" />}>
          <AnalyticsWrapper />
        </Suspense>
      </section>

      {/* 8. Technician Presence */}
      <section>
        <Suspense fallback={<div className="h-40 bg-muted/20 animate-pulse rounded-lg" />}>
          <TechnicianAvailability />
        </Suspense>
      </section>

    </div>
  );
}
