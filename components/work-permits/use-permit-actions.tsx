"use client";

import { useState, type ReactNode } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePrompt } from "@/components/ui/prompt-dialog";
import {
    approvePermit, cancelPermit, closePermit, rejectPermit,
    type PermitRow,
} from "@/modules/maintenance/adapters/actions/work-permit-actions";

/** Azioni sul singolo permesso (approva, rifiuta, chiudi, annulla), con conferme e messaggi. `dialogs` va reso nella pagina. */
export function usePermitActions(onDone: () => void): {
    busyId: string | null;
    approve: (p: PermitRow) => Promise<void>;
    reject: (p: PermitRow) => Promise<void>;
    close: (p: PermitRow) => Promise<void>;
    cancel: (p: PermitRow) => Promise<void>;
    dialogs: ReactNode;
} {
    const t = useT();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const { ask, dialog: promptDialog } = usePrompt();
    const [busyId, setBusyId] = useState<string | null>(null);

    async function run(p: PermitRow, action: () => Promise<{ success: boolean; message: string }>) {
        setBusyId(p.id);
        try {
            const res = await action();
            if (res.success) toast.success(res.message); else toast.error(res.message);
            onDone(); // anche dopo un errore: lo stato potrebbe essere cambiato per un'altra persona
        } catch {
            toast.error(t("Errore di connessione. Riprova."));
        } finally {
            setBusyId(null);
        }
    }

    const approve = (p: PermitRow) => run(p, () => approvePermit(p.id));

    const reject = async (p: PermitRow) => {
        const reason = await ask({
            title: t("Rifiutare «{name}»?", { name: p.typeName }),
            description: t("Chi ha fatto la richiesta riceve una notifica con il motivo."),
            label: t("Motivo del rifiuto"),
            required: true,
            confirmLabel: t("Rifiuta"),
            variant: "destructive",
        });
        if (reason === null) return;
        await run(p, () => rejectPermit(p.id, reason));
    };

    const close = async (p: PermitRow) => {
        const yes = await confirm({
            title: t("Chiudere «{name}»?", { name: p.typeName }),
            description: t("Il lavoro coperto da questo permesso è terminato. Dopo la chiusura il permesso non si può riaprire."),
            confirmLabel: t("Chiudi permesso"),
        });
        if (!yes) return;
        await run(p, () => closePermit(p.id));
    };

    const cancel = async (p: PermitRow) => {
        const yes = await confirm({
            title: t("Annullare «{name}»?", { name: p.typeName }),
            description: p.status === "ACTIVE"
                ? t("Il permesso è attivo: annullandolo il lavoro non è più coperto. L'azione non si può annullare.")
                : t("L'azione non si può annullare."),
            confirmLabel: t("Annulla permesso"),
            cancelLabel: t("Indietro"),
            variant: "destructive",
        });
        if (!yes) return;
        await run(p, () => cancelPermit(p.id));
    };

    return { busyId, approve, reject, close, cancel, dialogs: <>{confirmDialog}{promptDialog}</> };
}
