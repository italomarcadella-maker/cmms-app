"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestPermit, type OrderPermitsData } from "@/modules/maintenance/adapters/actions/work-permit-actions";

/** Valore di un campo datetime-local (ora locale del browser) -> ISO, oppure null se vuoto. */
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

export function RequestPermitDialog({ workOrderId, data, canManageTypes, open, onOpenChange, onDone }: {
    workOrderId: string;
    data: OrderPermitsData;
    canManageTypes: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
}) {
    const t = useT();
    // Il collegamento sta dentro la frase: si traduce la frase intera con un segnaposto e lo si sostituisce con il link
    const [linkBefore, linkAfter] = t("Creane uno dalla pagina {link}.", { link: "{link}" }).split("{link}");
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{t("Richiedi un permesso di lavoro")}</DialogTitle>
                    <DialogDescription>{t("Scegli il tipo di permesso necessario per questo ordine.")}</DialogDescription>
                </DialogHeader>
                {open && (data.types.length === 0
                    ? (
                        <p className="text-sm text-muted-foreground">
                            {t("Nessun tipo di permesso definito.")}{" "}
                            {canManageTypes
                                ? <>{linkBefore}<Link href="/permits" className="font-medium text-primary underline-offset-2 hover:underline">{t("Permessi di lavoro")}</Link>{linkAfter}</>
                                : t("Chiedi a un amministratore o al responsabile di plant di definirli.")}
                        </p>
                    )
                    : <RequestForm workOrderId={workOrderId} data={data} onClose={() => onOpenChange(false)} onDone={onDone} />)}
            </DialogContent>
        </Dialog>
    );
}

function RequestForm({ workOrderId, data, onClose, onDone }: { workOrderId: string; data: OrderPermitsData; onClose: () => void; onDone: () => void }) {
    const t = useT();
    const [typeId, setTypeId] = useState("");
    const [place, setPlace] = useState("");
    const [notes, setNotes] = useState("");
    const [validFrom, setValidFrom] = useState("");
    const [validTo, setValidTo] = useState("");
    const [busy, setBusy] = useState(false);

    const type = data.types.find(ty => ty.id === typeId);
    const issue = typeId ? data.issuesByType[typeId] : undefined;

    const submit = async () => {
        if (!type) { toast.error(t("Scegli il tipo di permesso.")); return; }
        setBusy(true);
        try {
            const res = await requestPermit({ workOrderId, typeId, place, notes, validFrom: toIso(validFrom), validTo: toIso(validTo) });
            if (res.success) { toast.success(res.message); onDone(); onClose(); } else toast.error(res.message);
        } catch {
            toast.error(t("Errore di connessione. Riprova."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="permit-type">{t("Tipo di permesso")}</Label>
                    <Select value={typeId} onValueChange={setTypeId}>
                        <SelectTrigger id="permit-type"><SelectValue placeholder={t("Scegli il tipo")} /></SelectTrigger>
                        <SelectContent>
                            {data.types.map(ty => <SelectItem key={ty.id} value={ty.id}>{ty.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {type && (
                        <p className="text-xs text-muted-foreground">
                            {type.description ? `${type.description} ` : ""}
                            {type.requiresApproval ? t("Richiede l'approvazione di un supervisor.") : t("Non richiede approvazione: viene approvato subito se i tecnici assegnati sono abilitati.")}
                            {type.requiredQualificationName ? ` ${t("Abilitazione richiesta: {name}.", { name: type.requiredQualificationName })}` : ""}
                            {type.defaultValidityHours ? ` ${t("Validità predefinita: {hours} ore.", { hours: type.defaultValidityHours })}` : ""}
                        </p>
                    )}
                </div>

                {issue && (
                    <div role="alert" className="flex items-start gap-2 rounded-md border border-transparent bg-warning-soft p-3 text-sm text-warning-strong">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <p><span className="font-medium">{t("Tecnici non abilitati.")}</span> {issue.text}.</p>
                    </div>
                )}
                {type?.requiredQualificationId && data.assigned.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("Nessun tecnico assegnato all'ordine: l'abilitazione non può essere verificata adesso.")}</p>
                )}

                <div className="grid gap-1.5">
                    <Label htmlFor="permit-place">{t("Luogo")}</Label>
                    <Input id="permit-place" value={place} maxLength={200} onChange={e => setPlace(e.target.value)} placeholder={t("Es. reparto, linea, punto dell'impianto")} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="permit-from">{t("Valido dal (facoltativo)")}</Label>
                        <Input id="permit-from" type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="permit-to">{t("Valido fino al (facoltativo)")}</Label>
                        <Input id="permit-to" type="datetime-local" value={validTo} onChange={e => setValidTo(e.target.value)} />
                    </div>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="permit-notes">{t("Note")}</Label>
                    <Textarea id="permit-notes" value={notes} maxLength={1000} onChange={e => setNotes(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t("Annulla")}</Button>
                <Button type="button" onClick={submit} disabled={!typeId || busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    {t("Invia richiesta")}
                </Button>
            </DialogFooter>
        </>
    );
}
