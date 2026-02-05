import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Timer } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Refresh every minute

async function getAndonStatus() {
    // Get critical assets
    // In a real scenario, this would group by Line
    const assets = await prisma.asset.findMany({
        where: {
            // production line filter?
        },
        include: {
            workOrders: {
                where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
                orderBy: { priority: 'asc' } // STOPPED first if using enum? Enum is LOW, MEDIUM, HIGH, STOPPED
            }
        },
        orderBy: { name: 'asc' }
    });
    return assets;
}

export default async function AndonPage() {
    const assets = await getAndonStatus();

    // Group assets by status for quick summary
    const stoppedAssets = assets.filter(a => a.status === 'OFFLINE' || a.workOrders.some(wo => wo.priority === 'STOPPED'));
    const warningAssets = assets.filter(a => !stoppedAssets.includes(a) && a.workOrders.length > 0);
    const okAssets = assets.filter(a => !stoppedAssets.includes(a) && !warningAssets.includes(a));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Column 1: OK Status */}
            <Card className="bg-zinc-900 border-green-900/50 flex flex-col">
                <CardHeader className="bg-green-900/20 pb-4 border-b border-green-900/30">
                    <CardTitle className="text-green-400 text-5xl font-black flex items-center gap-4">
                        <CheckCircle2 className="h-12 w-12" />
                        OPERATIVI
                        <span className="ml-auto text-6xl">{okAssets.length}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        {okAssets.map(asset => (
                            <div key={asset.id} className="p-4 rounded bg-green-950/30 border border-green-900/30">
                                <span className="text-xl font-bold text-green-100">{asset.name}</span>
                                <div className="text-green-500/80 text-sm">{asset.location}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Column 2: Warnings */}
            <Card className="bg-zinc-900 border-yellow-900/50 flex flex-col">
                <CardHeader className="bg-yellow-900/20 pb-4 border-b border-yellow-900/30">
                    <CardTitle className="text-yellow-500 text-5xl font-black flex items-center gap-4">
                        <Timer className="h-12 w-12" />
                        IN CODA
                        <span className="ml-auto text-6xl">{warningAssets.length}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
                    {warningAssets.map(asset => (
                        <div key={asset.id} className="p-4 rounded bg-yellow-950/30 border border-yellow-900/30 flex justify-between items-center">
                            <div>
                                <div className="text-2xl font-bold text-yellow-100">{asset.name}</div>
                                <div className="text-yellow-500">{asset.workOrders.length} ticket aperti</div>
                            </div>
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500 text-lg px-3 py-1">
                                {asset.workOrders[0].type}
                            </Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Column 3: CRITICAL */}
            <Card className="bg-zinc-900 border-red-900/50 flex flex-col animate-pulse-slow">
                <CardHeader className="bg-red-900/20 pb-4 border-b border-red-900/30">
                    <CardTitle className="text-red-500 text-5xl font-black flex items-center gap-4">
                        <AlertTriangle className="h-12 w-12" />
                        FERMI
                        <span className="ml-auto text-6xl">{stoppedAssets.length}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
                    {stoppedAssets.length === 0 && (
                        <div className="h-full flex items-center justify-center text-zinc-700 text-2xl font-medium">
                            NESSUN FERMO RILEVATO
                        </div>
                    )}
                    {stoppedAssets.map(asset => (
                        <div key={asset.id} className="p-6 rounded bg-red-950/50 border border-red-600 flex flex-col gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                            <div className="flex justify-between items-start">
                                <div className="text-3xl font-black text-white">{asset.name}</div>
                                <Badge className="bg-red-600 text-white hover:bg-red-700 text-xl px-4 py-1">FERMO</Badge>
                            </div>
                            <div className="text-red-200 text-xl truncate">
                                {asset.workOrders.find(w => w.priority === 'STOPPED')?.title || "Manutenzione Urgente"}
                            </div>
                            <div className="mt-2 text-right text-red-400 font-mono">
                                Da: {asset.workOrders[0]?.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <style>{`
                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; border-color: rgba(127, 29, 29, 0.5); }
                    50% { opacity: .95; border-color: rgba(220, 38, 38, 0.8); }
                }
            `}</style>
        </div>
    );
}
