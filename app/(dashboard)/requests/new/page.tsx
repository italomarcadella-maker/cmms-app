"use client";

import { RequestWizard } from "@/components/requests/request-wizard";

export default function NewRequestPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Nuova Segnalazione</h1>
            {/* Description handled inside Wizard steps now */}
            <RequestWizard />
        </div>
    );
}
