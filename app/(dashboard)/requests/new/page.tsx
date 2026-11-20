"use client";

import { RequestWizard } from "@/components/requests/request-wizard";
import { BackToDashboardButton } from "@/components/ui/back-button";
import { useT } from "@/lib/i18n/client";

export default function NewRequestPage() {
    const t = useT();
    return (
        <div className="space-y-6">
            <BackToDashboardButton />
            <h1 className="text-3xl font-bold tracking-tight">{t("Nuova Segnalazione")}</h1>
            {/* Description handled inside Wizard steps now */}
            <RequestWizard />
        </div>
    );
}
