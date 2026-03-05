import React from "react";
import { getPurchaseRequests } from "@/lib/inventory-actions";
import { PurchaseRequestsList } from "@/components/inventory/purchase-requests-list";

export const dynamic = 'force-dynamic';

export default async function PurchaseRequestsPage() {
    const requests = await getPurchaseRequests();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight print:hidden">Bozze d'Acquisto Automatiche</h1>
            <p className="text-muted-foreground">Gestisci le richieste di riordino generate automaticamente quando la giacenza scende sotto il limite minimo.</p>
            <PurchaseRequestsList initialRequests={requests as any} />
        </div>
    );
}
