"use client";

import { RequestWizard } from "@/components/requests/request-wizard";
import { BackToDashboardButton } from "@/components/ui/back-button";

export default function NewRequestPage() {
    return (
        <div className="space-y-6">
            <BackToDashboardButton />
            <h1 className="text-3xl font-bold tracking-tight">Nuova Segnalazione</h1>
            {/* Description handled inside Wizard steps now */}
            <RequestWizard />
        </div>
    );
}
