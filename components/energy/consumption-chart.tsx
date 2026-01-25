"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: '1 Gen', uv: 4000, pv: 2400, amt: 2400 },
    { name: '5 Gen', uv: 3000, pv: 1398, amt: 2210 },
    { name: '10 Gen', uv: 2000, pv: 9800, amt: 2290 },
    { name: '15 Gen', uv: 2780, pv: 3908, amt: 2000 },
    { name: '20 Gen', uv: 1890, pv: 4800, amt: 2181 },
    { name: '25 Gen', uv: 2390, pv: 3800, amt: 2500 },
    { name: '30 Gen', uv: 3490, pv: 4300, amt: 2100 },
];

export function ConsumptionChart() {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
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
                />
                <Area type="monotone" dataKey="uv" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                <Area type="monotone" dataKey="pv" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
