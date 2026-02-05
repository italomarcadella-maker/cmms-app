import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: { user: true }
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
                <p className="text-muted-foreground">Registro delle attività di sistema per sicurezza e compliance.</p>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Data/Ora</TableHead>
                            <TableHead className="w-[150px]">Utente</TableHead>
                            <TableHead className="w-[150px]">Azione</TableHead>
                            <TableHead>Dettagli</TableHead>
                            <TableHead className="w-[150px]">Risorsa ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="font-mono text-xs">
                                    {format(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                    {log.user.name || log.user.email}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{log.action}</Badge>
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">
                                    {log.details || '-'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground font-mono">
                                    {log.resourceId?.substring(0, 8)}...
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
