import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SafetyList } from "@/components/requests/safety-list";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getSafetyRequests() {
    return await prisma.workOrder.findMany({
        where: {
            OR: [
                { category: 'SAFETY' },
                { assetId: 'SYS-SAFETY' }
            ]
        },
        orderBy: [
            { priority: 'desc' }, // STOPPED > ...
            { createdAt: 'desc' }
        ],
        include: {
            asset: true,
            assignedTechnician: true
        }
    });
}

export default async function SafetyDashboardPage() {
    const requests = await getSafetyRequests();

    // Quick Stats
    const criticalCount = requests.filter(r => r.priority === 'STOPPED' && r.status !== 'COMPLETED').length;
    const openCount = requests.filter(r => ['OPEN', 'IN_PROGRESS'].includes(r.status)).length;
    const resolvedCount = requests.filter(r => r.status === 'COMPLETED').length;

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-red-600 flex items-center gap-2">
                    <ShieldAlert className="h-8 w-8" />
                    Dashboard Sicurezza
                </h1>
                <p className="text-muted-foreground">
                    Gestione centralizzata delle segnalazioni di sicurezza e incidenti.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <ShieldAlert className="h-6 w-6 text-red-600 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-red-900">Criticità Attive</p>
                            <p className="text-3xl font-bold text-red-700">{criticalCount}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-full">
                            <ShieldAlert className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-900">Segnalazioni Aperte</p>
                            <p className="text-3xl font-bold text-amber-700">{openCount}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-full">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-900">Risolti (Totale)</p>
                            <p className="text-3xl font-bold text-emerald-700">{resolvedCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Caricamento sicurezza...</div>}>
                <SafetyList requests={requests} />
            </Suspense>
        </div>
    );
}
