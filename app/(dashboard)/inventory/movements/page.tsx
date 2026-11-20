"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StockMovementsView } from "@/components/inventory/stock-movements-view";

export default function StockMovementsPage() {
    return (
        <Suspense fallback={null}>
            <MovementsContent />
        </Suspense>
    );
}

function MovementsContent() {
    const params = useSearchParams();
    return <StockMovementsView initialPartId={params.get("partId") ?? undefined} />;
}
