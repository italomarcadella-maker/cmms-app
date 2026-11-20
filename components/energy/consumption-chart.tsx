"use client";

import { useT, useFormat } from "@/lib/i18n/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ConsumptionChart({ data, mode = 'aggregate', unit = '' }: { data: any[], mode?: 'aggregate' | 'single', unit?: string }) {
    const t = useT();
    const fmt = useFormat();
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">{t("Nessun dato disponibile")}</div>;
    }
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                        return fmt.date(value, { day: '2-digit', month: 'short' });
                    }}
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    labelFormatter={(value) => fmt.date(value, { day: 'numeric', month: 'long', year: 'numeric' })}
                />

                {mode === 'aggregate' ? (
                    <>
                        <Line type="monotone" dataKey="elec" name={t("Elettricità (kWh)")} stroke="hsl(var(--primary))" strokeWidth={2} dot={true} connectNulls />
                        <Line type="monotone" dataKey="water" name={t("Acqua (m³)")} stroke="hsl(var(--blue-500))" strokeWidth={2} dot={true} connectNulls />
                        <Line type="monotone" dataKey="gas" name={t("Gas (m³)")} stroke="hsl(var(--orange-500))" strokeWidth={2} dot={true} connectNulls />
                    </>
                ) : (
                    <Line
                        type="monotone"
                        dataKey="consumption"
                        name={t("Consumo Giornaliero ({unit})", { unit })}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={true}
                        connectNulls
                        activeDot={{ r: 6 }}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
}
