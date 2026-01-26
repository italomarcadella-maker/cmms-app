"use client";

import { RequestList } from "@/components/requests/request-list";

export default function RequestsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Richieste di Intervento</h1>
            <p className="text-muted-foreground">Gestisci le tue richieste di manutenzione.</p>
            <RequestList />
        </div>
    );
}
