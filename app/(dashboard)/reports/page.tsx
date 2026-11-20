import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { getAssets } from "@/lib/actions";
import { getT } from "@/lib/i18n/server";

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
    const { t } = await getT();
    const { authorized } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER']);
    if (!authorized) redirect('/');

    const assets = (await getAssets()).filter((a: { id: string }) => !a.id.startsWith('SYS-'));

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader
                title={t("Schede asset")}
                description={t("Scheda di manutenzione di un macchinario, con cronologia degli interventi e costi, pronta da stampare o salvare in PDF per gli audit.")}
            />
            <Card>
                <CardContent className="p-2">
                    {assets.length === 0 ? (
                        <EmptyState title={t("Nessun asset")} description={t("Le schede si generano dagli asset registrati.")} />
                    ) : (
                        <ul className="divide-y">
                            {assets.map((asset: { id: string; name: string; location?: string }) => (
                                <li key={asset.id}>
                                    <Link href={`/reports/asset-history/${asset.id}`} className="group flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted">
                                        <span className="font-medium">{asset.name} {asset.location && <span className="font-normal text-muted-foreground">· {asset.location}</span>}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
