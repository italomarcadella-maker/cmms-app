import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/server";

export default async function MobileOrderNotFound() {
    const { t } = await getT();
    return (
        <EmptyState
            icon={<SearchX />}
            title={t("Ordine non trovato")}
            description={t("L'ordine non esiste oppure non è tra quelli che puoi vedere.")}
            action={<Button asChild size="lg"><Link href="/mobile">{t("Torna alle attività")}</Link></Button>}
        />
    );
}
