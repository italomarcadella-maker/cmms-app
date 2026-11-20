"use client";

import { useWorkOrders } from "@/lib/work-orders-context";
import { useAssets } from "@/lib/assets-context";
import { useReference } from "@/lib/reference-context";
import { getEffectiveSettings } from "@/lib/actions";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Euro, TrendingUp, TrendingDown, Hammer, Component } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subMonths, isSameMonth } from "date-fns";
import { BackToDashboardButton } from "@/components/ui/back-button";
import { useT, useFormat, useDateFnsLocale } from "@/lib/i18n/client";

export default function CostsPage() {
    const t = useT();
    const fmt = useFormat();
    const dfLocale = useDateFnsLocale();
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();

    const { technicians } = useReference();

    // Tariffa del tecnico; se non l'ha, quella predefinita nelle impostazioni dello stabilimento (la stessa usata da dashboard e ordini)
    const [defaultRate, setDefaultRate] = useState(0);
    useEffect(() => {
        getEffectiveSettings().then(st => { if (st?.defaultLaborHourlyRate) setDefaultRate(st.defaultLaborHourlyRate); }).catch(() => { });
    }, []);
    const rateOf = (technicianId: string) => technicians.find(x => x.id === technicianId)?.hourlyRate || defaultRate;
    const laborCostOf = (logs: { hours: number; technicianId: string }[] | undefined) =>
        (logs || []).reduce((sum, log) => sum + log.hours * rateOf(log.technicianId), 0);

    // Calculate Global Costs
    const totalLaborCost = workOrders.reduce((total, wo) => total + laborCostOf(wo.laborLogs), 0);
    const totalLaborHours = workOrders.reduce((total, wo) => total + (wo.laborLogs || []).reduce((sum, log) => sum + log.hours, 0), 0);

    const totalPartsCost = workOrders.reduce((total, wo) => {
        const woParts = (wo.partsUsed || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
        return total + woParts;
    }, 0);

    const totalMaintenanceCost = totalLaborCost + totalPartsCost;

    // Charts Data Preparation

    // 1. Costs by Asset (Top 10)
    // Group costs by Asset ID
    const assetCostMap = new Map<string, { name: string; labor: number; parts: number; total: number }>();

    workOrders.forEach(wo => {
        if (!wo.assetId) return;

        const current = assetCostMap.get(wo.assetId) || { name: wo.assetName || 'Unknown', labor: 0, parts: 0, total: 0 };

        // Labor
        const laborCost = laborCostOf(wo.laborLogs);

        // Parts
        const partsCost = (wo.partsUsed || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);

        current.labor += laborCost;
        current.parts += partsCost;
        current.total += (laborCost + partsCost);

        assetCostMap.set(wo.assetId, current);
    });

    const assetCosts = Array.from(assetCostMap.values())
        .map(item => ({
            ...item,
            labor: Math.round(item.labor),
            parts: Math.round(item.parts),
            total: Math.round(item.total)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    // 2. Costs Trend (Last 6 Months)
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthName = format(date, "MMM", { locale: dfLocale });

        const wosInMonth = workOrders.filter(wo => isSameMonth(new Date(wo.createdAt), date));

        const monthLaborCost = wosInMonth.reduce((acc, wo) => acc + laborCostOf(wo.laborLogs), 0);

        const monthPartsCost = wosInMonth.reduce((acc, wo) =>
            acc + (wo.partsUsed || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0), 0
        );

        const total = monthLaborCost + monthPartsCost;

        return {
            name: monthName,
            cost: Math.round(total)
        };
    });


    // Variazione reale rispetto al mese precedente (non un valore fisso)
    const prevMonth = last6Months[4]?.cost ?? 0;
    const thisMonth = last6Months[5]?.cost ?? 0;
    const monthTrend = prevMonth > 0 ? t("{pct}% vs mese scorso", { pct: `${thisMonth >= prevMonth ? "+" : ""}${Math.round(((thisMonth - prevMonth) / prevMonth) * 100)}` }) : undefined;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <BackToDashboardButton />
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {t("Analisi Costi")}
                </h1>
                <p className="text-muted-foreground mt-1">{t("Monitoraggio spese di manutenzione, manodopera e ricambi.")}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title={t("Costo Totale")}
                    value={`€ ${fmt.number(totalMaintenanceCost)}`}
                    icon={Euro}
                    trend={monthTrend}
                    color="text-emerald-600"
                />
                <KPICard
                    title={t("Manodopera")}
                    value={`€ ${fmt.number(totalLaborCost)}`}
                    icon={Hammer}
                    sub={t("{n} ore totali", { n: totalLaborHours })}
                    color="text-blue-600"
                />
                <KPICard
                    title={t("Ricambi")}
                    value={`€ ${fmt.number(totalPartsCost)}`}
                    icon={Component}
                    sub={t("Stima su interventi chiusi")}
                    color="text-amber-600"
                />
                <KPICard
                    title={t("Costo Medio / Asset")}
                    value={`€ ${fmt.number(Math.round(totalMaintenanceCost / (assets.length || 1)))}`}
                    icon={TrendingUp}
                    color="text-purple-600"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Cost by Asset Chart */}
                <div className="bg-card border rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold mb-6">{t("Primi 10 asset per costo di manutenzione")}</h3>
                    <div className="h-[420px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetCosts} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" unit="€" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value) => `€ ${value}`} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="labor" name={t("Manodopera")} stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="parts" name={t("Ricambi")} stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-card border rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold mb-6">{t("Andamento Spese (Semestrale)")}</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={last6Months}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `€ ${value}`} />
                                <Line type="monotone" dataKey="cost" name={t("Costo")} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, sub, trend, color }: any) {
    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                </div>
                <div className={cn("p-2 rounded-lg bg-muted/50", color)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {(sub || trend) && (
                <div className="mt-2 text-xs text-muted-foreground flex gap-2">
                    {trend && <span className="text-muted-foreground font-medium">{trend}</span>}
                    {sub && <span>{sub}</span>}
                </div>
            )}
        </div>
    );
}
