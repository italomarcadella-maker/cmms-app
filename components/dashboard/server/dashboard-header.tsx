import { PageHeader } from "@/components/ui/page-header";
import { HeaderClock } from "@/components/dashboard/header-clock";
import { getT } from "@/lib/i18n/server";

export async function DashboardHeader() {
    const { t } = await getT();
    return (
        <PageHeader
            title="Control Room"
            description={t("Lo stato dello stabilimento, in tempo reale.")}
            actions={<HeaderClock />}
        />
    );
}
