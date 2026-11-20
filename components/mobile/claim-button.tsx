"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hand, Loader2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { assignWorkOrderToSelf } from "@/lib/actions";

/** "Prendi in carico": l'ordine passa all'utente (azione esistente `assignWorkOrderToSelf`, che controlla tutto sul server). */
export function ClaimButton({ orderId, label, disabled = false, onDone }: { orderId: string; label?: string; disabled?: boolean; onDone?: () => void }) {
    const router = useRouter();
    const t = useT();
    const [busy, setBusy] = useState(false);

    const claim = async () => {
        setBusy(true);
        try {
            const res = await assignWorkOrderToSelf(orderId);
            if (res?.success) {
                toast.success(res.message ?? t("Ordine preso in carico"));
                onDone?.();
                router.refresh();
            } else {
                toast.error(res?.message ?? t("Non è stato possibile prendere in carico l'ordine"));
                router.refresh(); // se lo ha preso un collega, sparisce dall'elenco
            }
        } catch {
            toast.error(t("Errore di connessione. Riprova."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button type="button" size="lg" className="h-12 w-full text-base" onClick={claim} disabled={busy || disabled}>
            {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : <Hand className="mr-2 h-5 w-5" aria-hidden />}
            {label ?? t("Prendi in carico")}
        </Button>
    );
}
