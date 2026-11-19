import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MobileOrderView } from "@/components/mobile/order-view";
import { loadMobileOrder } from "@/lib/mobile-data";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

/**
 * Scheda mobile di un ordine. Un manutentore che apre l'ordine di un collega riceve "non trovato", come se non esistesse:
 * il filtro e' applicato sul server in loadMobileOrder.
 */
export default async function MobileOrderPage({ params }: PageProps) {
    const { id } = await params;
    const order = await loadMobileOrder(decodeURIComponent(id));
    if (!order) notFound();

    return (
        <div className="space-y-4">
            <Link href="/mobile" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Le attività
            </Link>
            <MobileOrderView order={order} />
        </div>
    );
}
