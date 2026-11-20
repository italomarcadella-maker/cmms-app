"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StockCountsView } from "@/components/inventory/stock-counts-view";

export default function StockCountsPage() {
    return (
        <Suspense fallback={null}>
            <CountsContent />
        </Suspense>
    );
}

function CountsContent() {
    const params = useSearchParams();
    return <StockCountsView initialCountId={params.get("count") ?? undefined} />;
}
