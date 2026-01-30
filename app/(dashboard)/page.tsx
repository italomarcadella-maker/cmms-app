"use client";

import { useAssets } from "@/lib/assets-context"; // Keep for rapid local state if needed, but pref server data
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
  BarChart3,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeadlineAlerts } from "@/components/calendar/deadline-alerts";
import { Skeleton, MetricCardSkeleton } from "@/components/ui/skeleton";
import { Suspense, useMemo, useState, useEffect } from "react";
import { AIDailyBrief } from "@/components/dashboard/ai-daily-brief";
import { getDetailedDashboardStats, getWorkOrderTrends, getRecentWorkOrders, getOverdueWorkOrders } from "@/lib/dashboard-actions";
// Removed import { getWorkOrders } from "@/lib/actions";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';

function DashboardContent() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [recentWOs, setRecentWOs] = useState<any[]>([]);
  const [overdueWOs, setOverdueWOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, t, wos, overdue] = await Promise.all([
          getDetailedDashboardStats(),
          getWorkOrderTrends(7),
          getRecentWorkOrders(5),
          getOverdueWorkOrders(10) // Fetch top overdue for alerts
        ]);
        setStats(s);
        setTrends(t);
        setRecentWOs(wos);
        setOverdueWOs(overdue);
      } catch (e) {
        console.error("Dashboard Load Error", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></div>;
  }

  // Safety fallback if stats failed to load
  const safeStats = stats || {
    totalAssets: 0,
    activeAssets: 0,
    offlineAssets: 0,
    totalWorkOrders: 0,
    openWorkOrders: 0,
    highPriorityOpen: 0,
    overdueWorkOrders: 0,
    avgHealth: 0
  };

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
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-background/50 backdrop-blur border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 shadow-sm cursor-help">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                Sistema Operativo
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tutti i servizi sono attivi e funzionanti correttamente.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-background/50 backdrop-blur border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 shadow-sm cursor-help">
                <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                Efficienza {safeStats.avgHealth}%
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Media salute globale degli asset monitorati.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <AIDailyBrief />

      {/* Primary Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Salute Impianto"
          value={`${safeStats.avgHealth}%`}
          icon={Activity}
          subtext="Media score globale"
          color="text-emerald-500"
        />
        <MetricCard
          title="Asset Totali"
          value={safeStats.totalAssets.toString()}
          icon={Box}
          subtext={`${safeStats.activeAssets} operativi, ${safeStats.offlineAssets} offline`}
          color="text-blue-500"
          alert={safeStats.offlineAssets > 0}
        />
        <MetricCard
          title="Ordini Aperti"
          value={safeStats.openWorkOrders.toString()}
          icon={ClipboardList}
          subtext={`${safeStats.highPriorityOpen} alta priorità`}
          color="text-amber-500"
          alert={safeStats.highPriorityOpen > 3}
          chartData={trends} // Pass trend data
        />
        <MetricCard
          title="Scadenze Critiche"
          value={safeStats.overdueWorkOrders.toString()}
          icon={AlertTriangle}
          subtext="Ordini ritardati"
          color={safeStats.overdueWorkOrders > 0 ? "text-red-500" : "text-emerald-500"}
          trend={safeStats.overdueWorkOrders === 0 ? "In orario" : "Attenzione"}
          trendUp={safeStats.overdueWorkOrders === 0}
          alert={safeStats.overdueWorkOrders > 0}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Alerts & KPI Focus */}
        <div className="md:col-span-8 space-y-6">

          {/* Trend Chart */}
          <div className="rounded-xl border bg-card shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Andamento Settimanale
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}
                    cursor={{ fill: 'var(--muted)' }}
                  />
                  <Bar dataKey="created" name="Nuovi" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completati" fill="var(--color-emerald-500)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
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
              {recentWOs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                    <ClipboardList className="h-6 w-6 opacity-50" />
                  </div>
                  <p>Nessuna attività registrata di recente.</p>
                </div>
              ) : (
                recentWOs.map((wo) => (
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
                          <span className="font-mono bg-muted/50 px-1 rounded">{wo.id.substring(0, 8)}...</span>
                          <span>•</span>
                          <span>{wo.asset?.name || 'Asset Generico'}</span>
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
          <DeadlineAlerts workOrders={overdueWOs} />

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
          // Mini chart logic using same recharts would go here if needed, but omitted for simplicity
          // Falling back to simple div bars if passed or nothing
          <div className="flex items-end gap-1 h-8 mt-2 opacity-50">
            <div className="bg-primary w-1 h-full rounded-t"></div>
            <div className="bg-primary w-1 h-3/4 rounded-t"></div>
            <div className="bg-primary w-1 h-1/2 rounded-t"></div>
          </div>
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
    ASSIGNED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  const labels: Record<string, string> = {
    OPEN: "Aperto",
    IN_PROGRESS: "In Corso",
    COMPLETED: "Completato",
    PENDING_APPROVAL: "In Attesa",
    CLOSED: "Chiuso",
    CANCELED: "Annullato",
    ASSIGNED: "Assegnato"
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
