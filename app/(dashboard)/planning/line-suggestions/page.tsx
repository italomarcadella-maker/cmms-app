import { PageHeader } from "@/components/ui/page-header";
import { LineSuggestions } from "@/components/planning/line-suggestions";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
    const { t } = await getT();
    return { title: t("Linee senza calendario di produzione") };
}

export default async function LineSuggestionsPage() {
    const { t } = await getT();
    return (
        <div className="mx-auto max-w-6xl">
            <PageHeader
                title={t("Linee senza calendario di produzione")}
                description={t("Senza un calendario di produzione la linea non ha vincoli: ecco cosa si può fare ora.")}
                breadcrumb={[{ label: t("Planning e calendario"), href: "/planning/calendar" }, { label: t("Suggerimenti per linea") }]}
            />
            <LineSuggestions />
        </div>
    );
}
