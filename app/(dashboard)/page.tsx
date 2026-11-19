import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/server/dashboard-header";
import { GaugesRow } from "@/components/dashboard/server/gauges-row";
import { SafetyCounterWidget } from "@/components/dashboard/server/safety-counter";
import { FailuresByShiftCard } from "@/components/dashboard/failures-by-shift";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { FunctionalAreasWidget } from "@/components/dashboard/server/functional-areas-widget";
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

      {/* Quadranti: i quattro indicatori che dicono se la giornata e' sotto controllo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense
          fallback={
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[170px] w-full rounded-xl" />
              ))}
            </>
          }
        >
          <GaugesRow />
        </Suspense>
      </div>

      {/* Sicurezza e guasti: il cronografo dei giorni senza infortuni e la mappa per reparto e turno */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-[260px] w-full rounded-xl" />}>
          <SafetyCounterWidget />
        </Suspense>
        <FailuresByShiftCard />
      </div>

      {/* Piano della settimana: clic su un giorno per vedere interventi, assegnatari e voci da assegnare */}
      <WeekCalendar />

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
