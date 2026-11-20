import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintLayout } from "@/components/reports/print-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n/server";

interface PageProps {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AssetHistoryReport({ params }: PageProps) {
    const { id } = await params;
    const { t, format: fmt } = await getT();
    const asset = await prisma.asset.findUnique({
        where: { id },
        include: {
            workOrders: {
                orderBy: { createdAt: 'desc' },
                include: { assignedTechnician: true, partsUsed: true }
            }
        }
    });

    if (!asset) notFound();

    const typedAsset = asset as any; // Bypass TS inference issues with deep includes

    const totalCost = asset.workOrders.reduce((sum: number, wo: any) => {
        // Mock cost calc if not in DB. Assuming parts cost + arbitrary labor for now?
        // Let's implement basics.
        return sum + 0;
    }, 0);

    return (
        <PrintLayout
            title={t("Scheda Manutenzione Asset: {name}", { name: typedAsset.name })}
            subtitle={t("Modello: {model} | S/N: {serial} | Locazione: {location}", { model: typedAsset.model, serial: typedAsset.serialNumber, location: typedAsset.location })}
        >
            <div className="space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border rounded-lg print:border-black print:bg-white">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">{t("Stato Attuale")}</p>
                        <p className="text-lg font-semibold">{typedAsset.status}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">{t("Interventi Totali")}</p>
                        <p className="text-lg font-semibold">{asset.workOrders.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">{t("Ultima Manutenzione")}</p>
                        <p className="text-lg font-semibold">
                            {asset.lastMaintenance ? fmt.date(asset.lastMaintenance, { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('N/A')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">{t("Health Score")}</p>
                        <p className="text-lg font-semibold">{asset.healthScore}%</p>
                    </div>
                </div>

                {/* History Table */}
                <div>
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">{t("Storico Interventi")}</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">{t("Data")}</TableHead>
                                <TableHead className="w-[80px]">{t("Tipo")}</TableHead>
                                <TableHead>{t("Descrizione")}</TableHead>
                                <TableHead className="w-[120px]">{t("Tecnico")}</TableHead>
                                <TableHead className="w-[100px]">{t("Stato")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {typedAsset.workOrders.map((wo: any) => (
                                <TableRow key={wo.id}>
                                    <TableCell className="font-medium text-xs">
                                        {fmt.dateTime(wo.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px]">{wo.type}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-semibold">{wo.title}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-2">{wo.description}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {wo.assignedTechnician?.name || t('N/A')}
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
