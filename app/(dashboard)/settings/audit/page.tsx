import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
    const { t, format: fmt } = await getT();
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        redirect('/');
    }

    const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: { user: true }
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("Audit Log")}</h1>
                <p className="text-muted-foreground">{t("Registro delle attività di sistema per sicurezza e compliance.")}</p>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">{t("Data/Ora")}</TableHead>
                            <TableHead className="w-[150px]">{t("Utente")}</TableHead>
                            <TableHead className="w-[150px]">{t("Azione")}</TableHead>
                            <TableHead>{t("Dettagli")}</TableHead>
                            <TableHead className="w-[150px]">{t("Risorsa ID")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="font-mono text-xs">
                                    {fmt.dateTime(log.timestamp, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                    {log.user ? (log.user.name || log.user.email) : t("Utente eliminato")}
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
