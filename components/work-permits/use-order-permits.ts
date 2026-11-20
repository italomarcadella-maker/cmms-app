"use client";

import { useCallback, useEffect, useState } from "react";
import { getPermitsForOrder, type OrderPermitsData } from "@/modules/maintenance/adapters/actions/work-permit-actions";

/**
 * Permessi di un ordine. Lo stato di caricamento si ricava confrontando la chiave della richiesta
 * con quella dell'ultima risposta; mentre si ricarica restano visibili i dati precedenti.
 */
export function useOrderPermits(workOrderId: string) {
    const [version, setVersion] = useState(0);
    const [result, setResult] = useState<{ key: string; data: OrderPermitsData | null; failed: boolean } | null>(null);
    const key = `${workOrderId}:${version}`;

    useEffect(() => {
        let alive = true;
        getPermitsForOrder(workOrderId)
            .then(data => { if (alive) setResult({ key, data, failed: false }); })
            .catch(e => { console.error(e); if (alive) setResult({ key, data: null, failed: true }); });
        return () => { alive = false; };
    }, [workOrderId, key]);

    const reload = useCallback(() => setVersion(v => v + 1), []);
    return { data: result?.data ?? null, failed: result?.failed ?? false, loading: result?.key !== key, reload };
}
