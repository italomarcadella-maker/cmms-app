import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, LineChart } from "lucide-react";
import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard/server/dashboard-header";
import { GaugesRow } from "@/components/dashboard/server/gauges-row";
import { AttentionWidget } from "@/components/dashboard/server/attention-widget";
import { AIInsightsWrapper } from "@/components/dashboard/server/ai-insights-wrapper";
import { SafetyCounterWidget } from "@/components/dashboard/server/safety-counter";
import { FailuresByShiftCard } from "@/components/dashboard/failures-by-shift";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  const session = await auth();
  const { t } = await getT();
  const canSeeKpi = ["ADMIN", "PLANT_MANAGER", "PROCESS_ENGINEER"].includes(session?.user?.role ?? "");

  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader />

      {/* I quattro indicatori che dicono se la giornata e' sotto controllo */}
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

      {/* Oggi: il calendario della settimana e, accanto, le poche cose da guardare subito */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <WeekCalendar />
        {/* Colonna a pila: ogni riquadro ha l altezza del proprio contenuto, cosi' non esce dalla riga e non finisce sotto i riquadri seguenti */}
        <div className="flex min-w-0 flex-col gap-4">
          <Suspense fallback={<Skeleton className="h-[260px] w-full rounded-xl" />}>
            <AttentionWidget />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[200px] w-full rounded-xl" />}>
            <AIInsightsWrapper />
          </Suspense>
        </div>
      </div>

      {/* Sicurezza e guasti */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-[260px] w-full rounded-xl" />}>
          <SafetyCounterWidget />
        </Suspense>
        <FailuresByShiftCard />
      </div>

      {/* Andamento e costi stanno in KPI e report: qui solo il collegamento */}
      {canSeeKpi && (
        <Link href="/kpi" className="block">
          <Card className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:border-primary/40">
            <span className="flex items-center gap-3 text-sm">
              <LineChart className="h-5 w-5 text-primary" aria-hidden />
              <span><span className="font-medium">{t("Andamento e costi")}</span> <span className="text-muted-foreground">· {t("trend settimanali, costi di manutenzione e analisi nei KPI e report")}</span></span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Card>
        </Link>
      )}
    </div>
  );
}
