"use client";

import { useWorkOrders } from "@/lib/work-orders-context";
import { WOPriorityBadge } from "./wo-priority-badge";
import { WOStatusBadge } from "./wo-status-badge";
import { Calendar, User, Box } from "lucide-react";
import { useState } from "react";

export function WorkOrderTable() {
    const { workOrders } = useWorkOrders();
    const [filter, setFilter] = useState("");

    const filtered = workOrders.filter(wo =>
        wo.title.toLowerCase().includes(filter.toLowerCase()) ||
        wo.assignedTo.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <input
                placeholder="Filter by title or technician..."
                className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />

            <div className="rounded-md border bg-card">
                <table className="w-full text-sm text-left">
                    <thead className="border-b bg-muted/40 text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-medium">Task</th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">Asset</th>
                            <th className="px-4 py-3 font-medium">Priority</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">Assigned To</th>
                            <th className="px-4 py-3 font-medium text-right">Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((wo) => (
                            <tr
                                key={wo.id}
                                className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group"
                                onClick={() => window.location.href = `/work-orders/${wo.id}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium text-foreground group-hover:text-primary transition-colors">{wo.title}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{wo.description}</div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Box className="h-3 w-3" />
                                        {wo.assetName}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <WOPriorityBadge priority={wo.priority} />
                                </td>
                                <td className="px-4 py-3">
                                    <WOStatusBadge status={wo.status} />
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        {wo.assignedTo}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {wo.dueDate}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
