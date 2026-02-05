import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintLayout } from "@/components/reports/print-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PageProps {
    params: { id: string };
}

export const dynamic = 'force-dynamic';

export default async function AssetHistoryReport({ params }: PageProps) {
    const asset = await prisma.asset.findUnique({
        where: { id: params.id },
        include: {
            workOrders: {
                orderBy: { createdAt: 'desc' },
                include: { assignedTechnician: true, partsUsed: true }
            }
        }
    });

    if (!asset) notFound();

    const totalCost = asset.workOrders.reduce((sum: number, wo: any) => {
        // Mock cost calc if not in DB. Assuming parts cost + arbitrary labor for now?
        // Let's implement basics.
        return sum + 0;
    }, 0);

    return (
        <PrintLayout
            title={`Scheda Manutenzione Asset: ${asset.name}`}
            subtitle={`Modello: ${asset.model} | S/N: ${asset.serialNumber} | Locazione: ${asset.location}`}
        >
            <div className="space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border rounded-lg print:border-black print:bg-white">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Stato Attuale</p>
                        <p className="text-lg font-semibold">{asset.status}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Interventi Totali</p>
                        <p className="text-lg font-semibold">{asset.workOrders.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Ultima Manutenzione</p>
                        <p className="text-lg font-semibold">
                            {asset.lastMaintenance ? format(asset.lastMaintenance, 'dd/MM/yyyy') : 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Health Score</p>
                        <p className="text-lg font-semibold">{asset.healthScore}%</p>
                    </div>
                </div>

                {/* History Table */}
                <div>
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">Storico Interventi</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Data</TableHead>
                                <TableHead className="w-[80px]">Tipo</TableHead>
                                <TableHead>Descrizione</TableHead>
                                <TableHead className="w-[120px]">Tecnico</TableHead>
                                <TableHead className="w-[100px]">Stato</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {asset.workOrders.map((wo) => (
                                <TableRow key={wo.id}>
                                    <TableCell className="font-medium text-xs">
                                        {format(wo.createdAt, 'dd/MM/yyyy HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px]">{wo.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-semibold">{wo.title}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-2">{wo.description}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {wo.assignedTechnician?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={wo.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px]">
                                            {wo.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </PrintLayout>
    );
}
