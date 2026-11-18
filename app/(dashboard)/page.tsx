import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/server/dashboard-header";
import { StatsGrid } from "@/components/dashboard/server/stats-grid";
import { FunctionalAreasWidget } from "@/components/dashboard/server/functional-areas-widget";
import { UpcomingSchedule } from "@/components/dashboard/server/upcoming-schedule";
import { TechnicianAvailability } from "@/components/dashboard/server/technician-availability";
import { Skeleton } from "@/components/ui/skeleton";
import { AIInsightsWrapper } from "@/components/dashboard/server/ai-insights-wrapper";
import { WeeklyTrends } from "@/components/dashboard/server/weekly-trends";
import { AnalyticsWrapper } from "@/components/dashboard/server/analytics-wrapper";
import { SafetyStatus } from "@/components/dashboard/server/safety-status";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-base font-semibold text-foreground">{children}</h2>;
}

export default function Home() {
  return (
    <div className="space-y-8 pb-10">
      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <DashboardHeader />
      </Suspense>

      {/* Summary first: the four numbers that tell whether the day is under control */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense
          fallback={
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[122px] w-full rounded-xl" />
              ))}
            </>
          }
        >
          <StatsGrid />
        </Suspense>
      </div>

      {/* Safety alerts stay at the top of the details */}
      <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
        <SafetyStatus />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
        <AIInsightsWrapper />
      </Suspense>

      <section>
        <SectionTitle>Aree funzionali</SectionTitle>
        <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
          <FunctionalAreasWidget />
        </Suspense>
      </section>

      <section>
        <SectionTitle>Programmazione dei prossimi giorni</SectionTitle>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <UpcomingSchedule />
        </Suspense>
      </section>

      <section className="space-y-4">
        <SectionTitle>Andamento e costi</SectionTitle>
        <Suspense fallback={<Skeleton className="h-[340px] w-full rounded-xl" />}>
          <WeeklyTrends />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
          <AnalyticsWrapper />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <TechnicianAvailability />
        </Suspense>
      </section>
    </div>
  );
}
