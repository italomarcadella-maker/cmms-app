"use client";

import { useAssets } from "@/lib/assets-context";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useInventory } from "@/lib/inventory-context";
import {
  Package,
  Wrench,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Box,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DeadlineAlerts } from "@/components/calendar/deadline-alerts";

export default function Home() {
  const { assets } = useAssets();
  const { workOrders } = useWorkOrders();
  const { parts } = useInventory();

  // KPI Calculations
  const totalAssets = assets.length;
  const activeAssets = assets.filter(a => a.status === 'OPERATIONAL').length;

  // Calculate Asset Health Trend (mock logic for now, could be real historical data later)
  const averageHealth = Math.round(assets.reduce((acc, curr) => acc + curr.healthScore, 0) / (totalAssets || 1));

  const activeWorkOrders = workOrders.filter(wo => wo.status !== 'COMPLETED').length;
  const highPriorityWOs = workOrders.filter(wo => wo.priority === 'HIGH' && wo.status !== 'COMPLETED').length;

  const lowStockItems = parts.filter(p => p.quantity <= p.minQuantity).length;
  const totalInventoryValue = parts.length; // Just count for now

  const recentWorkOrders = [...workOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Panoramica delle performance dell'impianto.</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="mr-1.5 flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Sistemi Operativi
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Efficienza Operativa"
          value="98.5%"
          icon={Activity}
          trend="+1.2% dal mese scorso"
          trendUp={true}
          color="text-emerald-500"
        />
        <MetricCard
          title="Totale Asset"
          value={activeAssets.toString()}
          icon={Box}
          trend="Tutti i sistemi attivi"
          trendUp={true}
          color="text-blue-500"
        />
        <MetricCard
          title="Ordini Attivi"
          value={activeWorkOrders.toString()}
          icon={ClipboardList}
          trend={`${highPriorityWOs} priorità alta`}
          trendUp={false} // warning color maybe?
          color="text-amber-500"
        />
        <MetricCard
          title="Salute Media Asset"
          value={`${Math.round(averageHealth)}%`}
          icon={TrendingUp}
          trend="In buone condizioni"
          trendUp={true}
          color="text-indigo-500"
        />
        <MetricCard
          title="Allerte Scorte"
          value={lowStockItems.toString()}
          icon={AlertTriangle}
          trend="Articoli sotto soglia"
          trendUp={lowStockItems === 0}
          color={lowStockItems > 0 ? "text-red-500" : "text-emerald-500"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Left Column: Alerts & Quick Stats */}
        <div className="md:col-span-3 space-y-6">
          <DeadlineAlerts workOrders={workOrders} />
          {/* Can add more widgets here later */}
        </div>

        {/* Recent Activity / Work Orders */}
        <div className="md:col-span-4 rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">Attività Recenti</h3>
              <p className="text-sm text-muted-foreground">Ultimi ordini di lavoro aggiornati.</p>
            </div>
            <Link href="/work-orders" className="text-sm text-primary hover:underline flex items-center gap-1">
              Vedi Tutti <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-0">
            <div className="divide-y">
              {recentWorkOrders.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Nessuna attività recente.
                </div>
              ) : (
                recentWorkOrders.map((wo) => (
                  <div key={wo.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-full",
                        wo.priority === 'HIGH' ? "bg-red-100 text-red-600" :
                          wo.priority === 'MEDIUM' ? "bg-amber-100 text-amber-600" :
                            "bg-blue-100 text-blue-600"
                      )}>
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{wo.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {wo.assetId} • {new Date(wo.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                        wo.status === 'COMPLETED' ? "bg-green-50/50 border-green-200 text-green-700" :
                          wo.status === 'IN_PROGRESS' ? "bg-blue-50/50 border-blue-200 text-blue-700" :
                            "bg-gray-50/50 border-gray-200 text-gray-700"
                      )}>
                        {wo.status === 'COMPLETED' ? 'COMPLETATO' :
                          wo.status === 'IN_PROGRESS' ? 'IN CORSO' : 'APERTO'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function MetricCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex justify-between items-center">
        <h3 className="tracking-tight text-sm font-medium">{title}</h3>
        {Icon && <Icon className={cn("h-4 w-4 text-muted-foreground", color)} />}
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-2xl font-bold">{value}</div>
        <p className={cn("text-xs", trendUp ? "text-green-500" : "text-red-500")}>
          {trendUp ? <ArrowUpRight className="inline h-3 w-3 mr-1" /> : <ArrowDownRight className="inline h-3 w-3 mr-1" />}
          {trend}
        </p>
      </div>
    </div>
  );
}
