"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { Activity, Clock, EuroIcon, TrendingDown } from "lucide-react";

interface AnalyticsChartsProps {
    data: {
        mttr: number;
        mtbf: number;
        avgCost?: number;
        totalCost?: number;
        trend: any[];
    };
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
    if (!data || data.trend.length === 0) return null;

    return (
        <div className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* MTTR/MTBF Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Efficienza Manutenzione
                        </CardTitle>
                        <CardDescription>
                            MTTR (Ore Riparazione) vs MTBF (Ore tra Guasti)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={data.trend}>
                                <defs>
                                    <linearGradient id="colorMtbf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="mtbf" name="MTBF (h)" stroke="#10b981" fillOpacity={1} fill="url(#colorMtbf)" />
                                <Area type="monotone" dataKey="mttr" name="MTTR (h)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorMttr)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* KPI Cards */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Metriche Chiave
                        </CardTitle>
                        <CardDescription>Ultimi 6 mesi</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">MTTR Medio</p>
                                <p className="text-2xl font-bold">{data.mttr} h</p>
                            </div>
                            <div className={`h-3 w-3 rounded-full ${data.mttr < 4 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </div>
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">MTBF Medio</p>
                                <p className="text-2xl font-bold">{data.mtbf} h</p>
                            </div>
                            <div className={`h-3 w-3 rounded-full ${data.mtbf > 720 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>
                        {data.avgCost !== undefined && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Costo Medio Intervento</p>
                                    <p className="text-2xl font-bold">€ {data.avgCost}</p>
                                </div>
                                <EuroIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Cost Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <EuroIcon className="h-5 w-5 text-purple-500" />
                        Analisi Costi Manutenzione
                    </CardTitle>
                    <CardDescription>Andamento costi globali (Materiali + Manodopera)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.trend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `€${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                                    formatter={(value) => [`€ ${value}`, 'Costo Totale']}
                                    contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                />
                                <Bar dataKey="cost" name="Costo (€)" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
