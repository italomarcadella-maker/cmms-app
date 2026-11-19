import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function MobileOrderNotFound() {
    return (
        <EmptyState
            icon={<SearchX />}
            title="Ordine non trovato"
            description="L'ordine non esiste oppure non è tra quelli che puoi vedere."
            action={<Button asChild size="lg"><Link href="/mobile">Torna alle attività</Link></Button>}
        />
    );
}
