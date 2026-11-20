"use client";

import { useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/text-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPermitType, updatePermitType, type PermitTypeRow } from "@/modules/maintenance/adapters/actions/work-permit-actions";
import { MAX_PRECAUTIONS, MAX_PRECAUTION_LENGTH, MAX_TYPE_NAME } from "@/modules/maintenance/domain/work-permits";

const NONE = "__none__";

/** Crea (type = null) o modifica un tipo di permesso. Le precauzioni sono libere: le scrive chi amministra, una per riga. */
export function PermitTypeDialog({ open, type, qualifications, onClose, onSaved }: {
    open: boolean;
    type: PermitTypeRow | null;
    qualifications: { id: string; name: string }[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const t = useT();
    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{type ? t("Modifica tipo di permesso") : t("Nuovo tipo di permesso")}</DialogTitle>
                    <DialogDescription>
                        {t("Il nome, l'abilitazione richiesta e le precauzioni da spuntare sono quelli previsti dalle procedure aziendali.")}
                    </DialogDescription>
                </DialogHeader>
                {open && <TypeForm key={type?.id ?? "new"} type={type} qualifications={qualifications} onClose={onClose} onSaved={onSaved} />}
            </DialogContent>
        </Dialog>
    );
}

function TypeForm({ type, qualifications, onClose, onSaved }: { type: PermitTypeRow | null; qualifications: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
    const t = useT();
    const [name, setName] = useState(type?.name ?? "");
    const [description, setDescription] = useState(type?.description ?? "");
    const [qualificationId, setQualificationId] = useState(type?.requiredQualificationId ?? NONE);
    const [requiresApproval, setRequiresApproval] = useState(type?.requiresApproval ?? true);
    const [hours, setHours] = useState(type?.defaultValidityHours ? String(type.defaultValidityHours) : "");
    const [precautions, setPrecautions] = useState((type?.precautions ?? []).join("\n"));
    const [isActive, setIsActive] = useState(type?.isActive ?? true);
    const [busy, setBusy] = useState(false);

    const lines = precautions.split("\n").map(l => l.trim()).filter(Boolean);
    const tooMany = lines.length > MAX_PRECAUTIONS;
    const tooLong = lines.some(l => l.length > MAX_PRECAUTION_LENGTH);

    const submit = async () => {
        if (!name.trim()) { toast.error(t("Inserisci il nome del tipo di permesso.")); return; }
        const h = hours.trim() === "" ? null : Number(hours);
        setBusy(true);
        try {
            const input = {
                name,
                description,
                requiredQualificationId: qualificationId === NONE ? null : qualificationId,
                requiresApproval,
                defaultValidityHours: h,
                precautions: lines,
                isActive,
            };
            const res = type ? await updatePermitType(type.id, input) : await createPermitType(input);
            if (res.success) { toast.success(res.message); onSaved(); onClose(); } else toast.error(res.message);
        } catch {
            toast.error(t("Errore di connessione. Riprova."));
        } finally {
            setBusy(false);
        }
    };

    // Un'abilitazione archiviata (tipo disattivato) resta selezionata finché non la si cambia
    const knownQualification = qualificationId === NONE || qualifications.some(q => q.id === qualificationId);

    return (
        <>
            <div className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="pt-name">{t("Nome")}</Label>
                    <Input id="pt-name" value={name} maxLength={MAX_TYPE_NAME} onChange={e => setName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="pt-desc">{t("Descrizione (facoltativa)")}</Label>
                    <Input id="pt-desc" value={description} maxLength={500} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="pt-qual">{t("Abilitazione richiesta ai tecnici (facoltativa)")}</Label>
                    <Select value={qualificationId} onValueChange={setQualificationId}>
                        <SelectTrigger id="pt-qual"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE}>{t("Nessuna")}</SelectItem>
                            {!knownQualification && type?.requiredQualificationName && <SelectItem value={qualificationId}>{t("{name} (non più attiva)", { name: type.requiredQualificationName })}</SelectItem>}
                            {qualifications.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("Se indicata, il permesso si approva e si attiva solo se tutti i tecnici assegnati all'ordine hanno questa abilitazione valida.")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="pt-hours">{t("Ore di validità predefinite (facoltative)")}</Label>
                        <Input id="pt-hours" type="number" inputMode="numeric" min={1} step={1} value={hours} onChange={e => setHours(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3 sm:mt-6">
                        <Label htmlFor="pt-approval" className="cursor-pointer">{t("Richiede approvazione")}</Label>
                        <Switch id="pt-approval" checked={requiresApproval} onCheckedChange={setRequiresApproval} />
                    </div>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="pt-prec">{t("Precauzioni da spuntare all'attivazione (una per riga)")}</Label>
                    <Textarea id="pt-prec" rows={6} value={precautions} onChange={e => setPrecautions(e.target.value)} />
                    <p className={tooMany || tooLong ? "text-xs font-medium text-critical-strong" : "text-xs text-muted-foreground"}>
                        {tooLong
                            ? t("{count} di {max} voci; una voce supera i {limit} caratteri.", { count: lines.length, max: MAX_PRECAUTIONS, limit: MAX_PRECAUTION_LENGTH })
                            : t("{count} di {max} voci.", { count: lines.length, max: MAX_PRECAUTIONS })}
                        {" "}{t("Se non ne scrivi nessuna, l'attivazione non richiede spunte.")}
                    </p>
                </div>
                {type && (
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <Label htmlFor="pt-active" className="cursor-pointer">{t("Tipo attivo (selezionabile nelle nuove richieste)")}</Label>
                        <Switch id="pt-active" checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{t("Annulla")}</Button>
                <Button type="button" onClick={submit} disabled={busy || !name.trim() || tooMany || tooLong}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    {t("Salva")}
                </Button>
            </DialogFooter>
        </>
    );
}
