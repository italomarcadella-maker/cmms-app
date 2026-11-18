"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { cn } from "@/lib/utils";
import { chartColors } from "@/lib/chart-colors";

interface AnalyticsChartsProps {
    data: {
        mttr: number;
        mtbf: number;
        avgCost?: number;
        totalCost?: number;
        trend: any[];
    };
}

const tooltipStyle = { borderRadius: 8, border: `1px solid ${chartColors.grid}`, fontSize: 12 };

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
    if (!data || data.trend.length === 0) return null;

    const mttrGood = data.mttr < 4;
    const mtbfGood = data.mtbf > 720;

    return (
        <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-7">
                {/* MTTR/MTBF Chart */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Efficienza manutenzione</CardTitle>
                        <CardDescription>MTTR (ore di riparazione) e MTBF (ore tra i guasti)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data.trend}>
                                <defs>
                                    <linearGradient id="colorMtbf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.45} />
                                        <stop offset="95%" stopColor={chartColors.success} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColors.critical} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={chartColors.critical} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                                <XAxis dataKey="name" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                <Area type="monotone" dataKey="mtbf" name="MTBF (h)" stroke={chartColors.success} strokeWidth={2} fill="url(#colorMtbf)" />
                                <Area type="monotone" dataKey="mttr" name="MTTR (h)" stroke={chartColors.critical} strokeWidth={2} fill="url(#colorMttr)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Key metrics */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Metriche chiave</CardTitle>
                        <CardDescription>Ultimi 6 mesi</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <Metric label="MTTR medio" value={`${data.mttr} h`} good={mttrGood} />
                        <Metric label="MTBF medio" value={`${data.mtbf} h`} good={mtbfGood} />
                        {data.avgCost !== undefined && (
                            <Metric label="Costo medio intervento" value={`€ ${data.avgCost.toLocaleString("it-IT")}`} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Cost Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Analisi costi di manutenzione</CardTitle>
                    <CardDescription>Andamento dei costi globali (materiali e manodopera)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                                <XAxis dataKey="name" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                                <Tooltip
                                    cursor={{ fill: chartColors.grid, opacity: 0.4 }}
                                    formatter={(value) => [`€ ${value}`, 'Costo totale']}
                                    contentStyle={tooltipStyle}
                                />
                                <Bar dataKey="cost" name="Costo (€)" fill={chartColors.primary} radius={[4, 4, 0, 0]} maxBarSize={56} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
    return (
        <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </div>
            {good !== undefined && (
                <span
                    role="img"
                    aria-label={good ? "Valore nella norma" : "Valore da migliorare"}
                    className={cn("h-2.5 w-2.5 rounded-full", good ? "bg-success" : "bg-warning")}
                />
            )}
        </div>
    );
}
