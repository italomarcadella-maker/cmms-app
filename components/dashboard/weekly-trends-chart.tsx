"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chartColors } from "@/lib/chart-colors";

export function WeeklyTrendsChart({ data }: { data: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Andamento settimanale</CardTitle>
                <CardDescription>Ordini di lavoro creati e completati negli ultimi giorni</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                            <XAxis dataKey="date" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} dy={8} />
                            <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <RechartsTooltip
                                cursor={{ fill: chartColors.grid, opacity: 0.4 }}
                                contentStyle={{ borderRadius: 8, border: `1px solid ${chartColors.grid}`, fontSize: 12 }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="created" name="Nuovi" fill={chartColors.primary} radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="completed" name="Completati" fill={chartColors.success} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
