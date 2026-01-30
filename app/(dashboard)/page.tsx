"use client";

import { useAssets } from "@/lib/assets-context";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useInventory } from "@/lib/inventory-context";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Box,
  ClipboardList,
  Wrench,
  AlertTriangle,
  Zap,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DeadlineAlerts } from "@/components/calendar/deadline-alerts";
import { Skeleton, MetricCardSkeleton } from "@/components/ui/skeleton";
import { Suspense, useMemo } from "react";
import { AIDailyBrief } from "@/components/dashboard/ai-daily-brief";

// Mock Chart Component - In real app use Recharts/Tremor
const MiniChart = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-8 mt-2">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("w-1.5 rounded-t-sm opacity-60 hover:opacity-100 transition-opacity", color)}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
};

function DashboardContent() {
  const { assets } = useAssets();
  const { workOrders } = useWorkOrders();
  const { parts } = useInventory();

  // --- KPI Logic ---
  const kpis = useMemo(() => {
    if (!assets || !workOrders || !parts) return null;

    const totalAssets = assets.length;
    const activeAssets = assets.filter(a => a.status === 'OPERATIONAL').length;
    const healthAvg = assets.length > 0 ? Math.round(assets.reduce((a, b) => a + b.healthScore, 0) / assets.length) : 0;

    const activeWOs = workOrders.filter(w => w.status !== 'COMPLETED' && w.status !== 'CLOSED' && w.status !== 'CANCELED');
    const highPriority = activeWOs.filter(w => w.priority === 'HIGH').length;

    const reliabilityData = [92, 94, 95, 93, 97, 98, 98]; // Mock data
    const woVolumeData = [12, 10, 15, 8, 20, 14, activeWOs.length]; // Mock data

    // Inventory Logic
    const lowStockItems = parts.filter(p => p.quantity <= p.minQuantity).length;

    return { totalAssets, activeAssets, healthAvg, activeWOs: activeWOs.length, highPriority, reliabilityData, woVolumeData, lowStockItems };
  }, [assets, workOrders, parts]);

  if (!kpis) return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></div>;

  const recentWorkOrders = [...workOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Control Room
          </h1>
          <p className="text-muted-foreground mt-1">Monitoraggio in tempo reale delle operazioni.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-background/50 backdrop-blur border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 shadow-sm">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            Sistema Operativo
          </div>
          <div className="bg-background/50 backdrop-blur border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 shadow-sm">
            <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
            Efficienza 98%
          </div>
        </div>
      </div>

      <AIDailyBrief />

      {/* Primary Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Salute Impianto"
          value={`${kpis.healthAvg}%`}
          icon={Activity}
          subtext="Media score globale"
          color="text-emerald-500"
          chartData={kpis.reliabilityData}
          chartColor="bg-emerald-500"
        />
        <MetricCard
          title="Asset Totali"
          value={kpis.totalAssets.toString()}
          icon={Box}
          subtext={`${kpis.activeAssets} operativi attivi`}
          color="text-blue-500"
          trend="+2 New"
          trendUp={true}
        />
        <MetricCard
          title="Ordini Aperti"
          value={kpis.activeWOs.toString()}
          icon={ClipboardList}
          subtext={`${kpis.highPriority} alta priorità`}
          color="text-amber-500"
          alert={kpis.highPriority > 3}
          chartData={kpis.woVolumeData}
          chartColor="bg-amber-500"
        />
        <MetricCard
          title="Allerte Scorte"
          value={kpis.lowStockItems.toString()}
          icon={AlertTriangle}
          subtext="Articoli sotto soglia"
          color={kpis.lowStockItems > 0 ? "text-red-500" : "text-emerald-500"}
          trend={kpis.lowStockItems === 0 ? "Scorte ottimali" : "Rifornire"}
          trendUp={kpis.lowStockItems === 0}
          alert={kpis.lowStockItems > 0}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Alerts & KPI Focus */}
        <div className="md:col-span-8 space-y-6">
          {/* Recent Activity Card */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b flex justify-between items-center bg-muted/20">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Attività Recenti
                </h3>
              </div>
              <Link href="/work-orders" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                Visualizza Tutti <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="divide-y max-h-[400px] overflow-y-auto">
              {recentWorkOrders.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                    <ClipboardList className="h-6 w-6 opacity-50" />
                  </div>
                  <p>Nessuna attività registrata di recente.</p>
                </div>
              ) : (
                recentWorkOrders.map((wo) => (
                  <div key={wo.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        wo.type === 'FAULT' ? "bg-red-50 text-red-600 dark:bg-red-900/20" :
                          wo.type === 'ROUTINE' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" :
                            "bg-purple-50 text-purple-600 dark:bg-purple-900/20"
                      )}>
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div>
                        <Link href={`/work-orders/${wo.id}`} className="font-semibold text-sm hover:text-primary transition-colors block mb-0.5">
                          {wo.title}
                        </Link>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="font-mono bg-muted/50 px-1 rounded">{wo.id}</span>
                          <span>•</span>
                          <span>{wo.assetName}</span>
                          <span>•</span>
                          <span>{new Date(wo.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <WOStatusBadge status={wo.status} />
                      {wo.priority === 'HIGH' && (
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> URGENTE
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deadlines & Quick actions */}
        <div className="md:col-span-4 space-y-6">
          <DeadlineAlerts workOrders={workOrders} />

          {/* Quick Actions Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Azioni Rapide</h3>
            <div className="space-y-2">
              <Link href="/requests/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-input">
                <div className="bg-primary/10 p-2 rounded-md text-primary">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Nuova Segnalazione</div>
                  <div className="text-xs text-muted-foreground">Segnala un guasto urgente</div>
                </div>
              </Link>
              <Link href="/work-orders/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-input">
                <div className="bg-blue-500/10 p-2 rounded-md text-blue-500">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Crea Ordine</div>
                  <div className="text-xs text-muted-foreground">Pianifica manutenzione</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Components ---

function MetricCard({ title, value, icon: Icon, subtext, trend, trendUp, color, alert, chartData, chartColor }: any) {
  return (
    <div className={cn(
      "rounded-xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden transition-all hover:shadow-md",
      alert && "border-red-500 shadow-red-500/20"
    )}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={cn("p-2 rounded-lg bg-background/80 backdrop-blur-sm", color)}>
          {Icon && <Icon className="h-4 w-4" />}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}

        {trend && (
          <div className={cn("mt-2 flex items-center text-xs font-medium", trendUp ? "text-emerald-500" : "text-red-500")}>
            {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            {trend}
          </div>
        )}

        {chartData && (
          <MiniChart data={chartData} color={chartColor} />
        )}
      </div>
    </div>
  );
}

const WOStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
    CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
    CANCELED: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    OPEN: "Aperto",
    IN_PROGRESS: "In Corso",
    COMPLETED: "Completato",
    PENDING_APPROVAL: "In Attesa",
    CLOSED: "Chiuso",
    CANCELED: "Annullato",
  };
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider", styles[status] || styles.CLOSED)}>
      {labels[status] || status}
    </span>
  );
};

export default function Home() {
  return (
    <Suspense fallback={<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
