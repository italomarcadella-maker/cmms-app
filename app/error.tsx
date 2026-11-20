"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/**
 * Pagina mostrata quando un componente va in errore. Il dettaglio tecnico resta nel log (e nel codice "digest"
 * che permette di ritrovarlo nei log del server): all'utente non si mostrano messaggi interni.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const t = useT();
    useEffect(() => {
        console.error("Errore di pagina:", error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <h2 className="text-xl font-semibold">{t("Qualcosa non ha funzionato")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">
                {t("Si è verificato un errore imprevisto. Puoi riprovare; se il problema continua, segnalalo indicando il codice qui sotto.")}
            </p>
            {error.digest && <code className="rounded bg-muted px-2 py-1 text-xs">{error.digest}</code>}
            <Button onClick={() => reset()}>{t("Riprova")}</Button>
        </div>
    );
}
