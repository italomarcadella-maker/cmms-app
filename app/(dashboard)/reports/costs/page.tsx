import { getCostAnalytics } from "@/lib/cost-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Euro, Wrench, Hammer, BarChart3 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function CostReportPage() {
    // Default to YEAR for the page
    const data = await getCostAnalytics('YEAR');

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analisi Costi (YTD)</h1>
                <p className="text-muted-foreground">Riepilogo economico della manutenzione per l'anno corrente.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Totale</CardTitle>
                        <Euro className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totalCost)}</div>
                        <p className="text-xs text-muted-foreground">Manodopera + Ricambi</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ricambi</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totalPartsCost)}</div>
                        <p className="text-xs text-muted-foreground">{(data.totalPartsCost / data.totalCost * 100).toFixed(1)}% del totale</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manodopera</CardTitle>
                        <Hammer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totalLaborCost)}</div>
                        <p className="text-xs text-muted-foreground">{(data.totalLaborCost / data.totalCost * 100).toFixed(1)}% del totale</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Top Assets Table */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Top 10 Asset Costosi</CardTitle>
                        <CardDescription>Macchinari con maggiore spesa di manutenzione.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topAssets.map((asset, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{asset.name}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(asset.cost)}</TableCell>
                                    </TableRow>
                                ))}
                                {data.topAssets.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground p-4">Nessun dato disponibile</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Department Breakdown */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Costi per Reparto</CardTitle>
                        <CardDescription>Distribuzione spese per area.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.costByDepartment.map((dept, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">{dept.department}</p>
                                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-primary h-full"
                                                style={{ width: `${(dept.cost / data.totalCost) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="font-mono text-sm ml-4">{formatCurrency(dept.cost)}</div>
                                </div>
                            ))}
                            {data.costByDepartment.length === 0 && (
                                <div className="text-center text-muted-foreground">Nessun dato</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
