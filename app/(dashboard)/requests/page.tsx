"use client";

import { RequestList } from "@/components/requests/request-list";
import { RequestStats } from "@/components/requests/request-stats";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAuth } from "@/lib/auth-context";

export default function RequestsPage() {
    const { user } = useAuth();
    const { workOrders } = useWorkOrders();

    // Filter requests
    const myRequests = workOrders.filter(wo => wo.requesterId === user?.id && wo.type === 'REQUEST');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Richieste di Intervento
                </h1>
                <p className="text-muted-foreground mt-1">Gestisci le tue richieste di manutenzione.</p>
            </div>

            <RequestStats requests={myRequests} />

            <div className="mt-8">
                <RequestList requests={myRequests} />
            </div>
        </div>
    );
}
