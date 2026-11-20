"use client";

import { useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { activatePermit, type PermitRow } from "@/modules/maintenance/adapters/actions/work-permit-actions";
import { usePermitFormat } from "./permit-ui";

/** Attivazione: si attiva solo spuntando tutte le precauzioni definite per il tipo di permesso. */
export function ActivatePermitDialog({ permit, onClose, onDone }: { permit: PermitRow | null; onClose: () => void; onDone: () => void }) {
    return (
        <Dialog open={!!permit} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
                {permit && <ActivateForm key={permit.id} permit={permit} onClose={onClose} onDone={onDone} />}
            </DialogContent>
        </Dialog>
    );
}

function ActivateForm({ permit, onClose, onDone }: { permit: PermitRow; onClose: () => void; onDone: () => void }) {
    const t = useT();
    const { validityText } = usePermitFormat();
    const [checked, setChecked] = useState<boolean[]>(() => permit.precautions.map(() => false));
    const [busy, setBusy] = useState(false);
    const all = checked.every(Boolean);

    const submit = async () => {
        setBusy(true);
        try {
            const res = await activatePermit(permit.id, checked);
            if (res.success) { toast.success(res.message); onDone(); onClose(); } else toast.error(res.message);
        } catch {
            toast.error(t("Errore di connessione. Riprova."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("Attiva «{name}»", { name: permit.typeName })}</DialogTitle>
                <DialogDescription>{validityText(permit.validFrom, permit.validTo)}</DialogDescription>
            </DialogHeader>
            {permit.precautions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Per questo tipo di permesso non sono definite precauzioni da spuntare.")}</p>
            ) : (
                <fieldset className="grid gap-2">
                    <legend className="mb-1 text-sm font-medium">{t("Spunta ogni precauzione per attivare il permesso ({done} di {total})", { done: checked.filter(Boolean).length, total: checked.length })}</legend>
                    {permit.precautions.map((label, i) => (
                        <div key={i} className="flex min-h-[44px] items-start gap-3 rounded-md border p-3">
                            <Checkbox id={`prec-${permit.id}-${i}`} checked={checked[i]} onCheckedChange={c => setChecked(prev => prev.map((v, j) => (j === i ? c : v)))} />
                            <Label htmlFor={`prec-${permit.id}-${i}`} className="flex-1 cursor-pointer text-sm font-normal leading-snug">{label}</Label>
                        </div>
                    ))}
                </fieldset>
            )}
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t("Annulla")}</Button>
                <Button type="button" onClick={submit} disabled={!all || busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    {t("Attiva permesso")}
                </Button>
            </DialogFooter>
        </>
    );
}
