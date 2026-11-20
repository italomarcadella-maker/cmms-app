"use client";

import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { RequestList } from "@/components/requests/request-list";
import { RequestStats } from "@/components/requests/request-stats";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/client";

export default function RequestsPage() {
    const t = useT();
    const { user } = useAuth();
    const { workOrders } = useWorkOrders();

    // Filter requests
    const myRequests = workOrders.filter(wo => wo.requesterId === user?.id && wo.type === 'REQUEST');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        {t("Richieste di Intervento")}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t("Gestisci le tue richieste di manutenzione.")}</p>
                </div>
                <Link href="/requests/material" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <PackageOpen className="h-4 w-4" /> {t("Richieste di materiale")}
                </Link>
            </div>

            <RequestStats requests={myRequests} />

            <div className="mt-8">
                <RequestList requests={myRequests} />
            </div>
        </div>
    );
}
