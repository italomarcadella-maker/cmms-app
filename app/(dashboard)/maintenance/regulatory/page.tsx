import { Scale } from "lucide-react";

import { getRegulatoryDeadlines } from "@/modules/maintenance/adapters/actions/regulatory-actions";
import { RegulatoryDeadlines } from "@/components/maintenance/regulatory-deadlines";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function RegulatoryPage() {
    const { t } = await getT();
    const data = await getRegulatoryDeadlines();

    return (
        <div className="space-y-2 pb-10">
            <PageHeader
                title={t("Scadenziario normativo")}
                description={t("Manutenzioni e verifiche richieste dalla legge, in ordine di urgenza. Una verifica si segna come di legge dal suo piano di manutenzione.")}
                breadcrumb={[{ label: t("Manutenzione") }, { label: t("Scadenziario normativo") }]}
            />
            {data.success ? (
                <RegulatoryDeadlines rows={data.rows} totals={data.totals} />
            ) : (
                <EmptyState icon={<Scale />} title={t("Scadenziario non disponibile")} description={data.message ? t(data.message) : t("Non hai i permessi per vedere questa pagina.")} />
            )}
        </div>
    );
}
