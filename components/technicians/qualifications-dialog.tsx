"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Pencil, Plus, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    createQualificationType, renameQualificationType, setQualificationTypeActive, setTechnicianQualifications,
    type QualificationTypeRow, type TechnicianQualificationRow,
} from "@/modules/maintenance/adapters/actions/qualification-actions";

/** aaaa-mm-gg dalla data salvata (mezzogiorno locale): si usano i componenti locali per non scivolare di giorno. */
function dayKey(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface Entry { checked: boolean; expiresAt: string; notes: string }

export function QualificationsDialog({ technician, types, current, canManageTypes, trigger, onSaved }: {
    technician: { id: string; name: string };
    types: QualificationTypeRow[];
    current: TechnicianQualificationRow[];
    canManageTypes: boolean;
    trigger: ReactNode;
    /** Chiamata dopo ogni modifica (abilitazioni o tipi) per ricaricare l'elenco. */
    onSaved: () => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Abilitazioni di {technician.name}</DialogTitle>
                    <DialogDescription>
                        Spunta le attività per cui il tecnico è abilitato. La scadenza è facoltativa. Inserisci solo nomi di abilitazioni e scadenze.
                    </DialogDescription>
                </DialogHeader>
                {open && (
                    <QualificationsForm
                        technicianId={technician.id}
                        types={types}
                        current={current}
                        canManageTypes={canManageTypes}
                        onTypesChanged={onSaved}
                        onDone={() => { setOpen(false); onSaved(); }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function QualificationsForm({ technicianId, types, current, canManageTypes, onTypesChanged, onDone }: {
    technicianId: string;
    types: QualificationTypeRow[];
    current: TechnicianQualificationRow[];
    canManageTypes: boolean;
    onTypesChanged: () => void;
    onDone: () => void;
}) {
    const [entries, setEntries] = useState<Record<string, Entry>>(() =>
        Object.fromEntries(current.map(q => [q.typeId, { checked: true, expiresAt: dayKey(q.expiresAt), notes: q.notes ?? "" }])),
    );
    const [newName, setNewName] = useState("");
    const [busy, setBusy] = useState(false);
    const { confirm, dialog: confirmDialog } = useConfirm();
    const { ask, dialog: promptDialog } = usePrompt();

    const entryOf = (typeId: string): Entry => entries[typeId] ?? { checked: false, expiresAt: "", notes: "" };
    const patch = (typeId: string, change: Partial<Entry>) =>
        setEntries(prev => ({ ...prev, [typeId]: { ...entryOf(typeId), ...prev[typeId], ...change } }));

    const save = async () => {
        setBusy(true);
        const items = types
            .filter(t => entryOf(t.id).checked)
            .map(t => ({ typeId: t.id, expiresAt: entryOf(t.id).expiresAt || null, notes: entryOf(t.id).notes }));
        const res = await setTechnicianQualifications(technicianId, items);
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    const addType = async () => {
        if (!newName.trim()) return;
        const res = await createQualificationType(newName);
        if (res.success) {
            toast.success(res.message);
            setNewName("");
            if (res.id) patch(res.id, { checked: true }); // il tipo appena creato viene spuntato per chi lo sta aggiungendo
            onTypesChanged();
        } else toast.error(res.message);
    };

    const rename = async (t: QualificationTypeRow) => {
        const name = await ask({ title: "Rinomina l'abilitazione", label: "Nome", defaultValue: t.name, required: true, confirmLabel: "Salva" });
        if (name === null) return;
        const res = await renameQualificationType(t.id, name);
        if (res.success) { toast.success(res.message); onTypesChanged(); } else toast.error(res.message);
    };

    const deactivate = async (t: QualificationTypeRow) => {
        const yes = await confirm({
            title: `Disattivare «${t.name}»?`,
            description: "Il tipo non comparirà più nelle schede. Le abilitazioni già assegnate restano archiviate e si possono recuperare riattivandolo.",
            confirmLabel: "Disattiva",
            variant: "destructive",
        });
        if (!yes) return;
        const res = await setQualificationTypeActive(t.id, false);
        if (res.success) { toast.success(res.message); onTypesChanged(); } else toast.error(res.message);
    };

    return (
        <div className="grid gap-4">
            {types.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun tipo di abilitazione definito.</p>
            ) : (
                <ul className="grid gap-2">
                    {types.map(t => {
                        const e = entryOf(t.id);
                        return (
                            <li key={t.id} className="rounded-md border p-3">
                                <div className="flex items-center gap-3">
                                    <Checkbox id={`q-${t.id}`} checked={e.checked} onCheckedChange={(c) => patch(t.id, { checked: c })} />
                                    <Label htmlFor={`q-${t.id}`} className="flex-1 cursor-pointer font-medium">{t.name}</Label>
                                    {canManageTypes && (
                                        <div className="flex gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Rinomina" aria-label={`Rinomina ${t.name}`} onClick={() => rename(t)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Disattiva" aria-label={`Disattiva ${t.name}`} onClick={() => deactivate(t)}>
                                                <EyeOff className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {e.checked && (
                                    <div className="mt-3 grid gap-3 sm:grid-cols-[170px_1fr]">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor={`q-exp-${t.id}`} className="text-xs">Scadenza (facoltativa)</Label>
                                            <Input id={`q-exp-${t.id}`} type="date" value={e.expiresAt} onChange={(ev) => patch(t.id, { expiresAt: ev.target.value })} />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor={`q-note-${t.id}`} className="text-xs">Nota (facoltativa)</Label>
                                            <Input id={`q-note-${t.id}`} maxLength={200} value={e.notes} onChange={(ev) => patch(t.id, { notes: ev.target.value })} />
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {canManageTypes && (
                <div className="grid gap-1.5 border-t pt-4">
                    <Label htmlFor="q-new">Aggiungi un tipo di abilitazione</Label>
                    <div className="flex gap-2">
                        <Input
                            id="q-new"
                            value={newName}
                            maxLength={80}
                            placeholder="Es. Spazi confinati"
                            onChange={(ev) => setNewName(ev.target.value)}
                            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addType(); } }}
                        />
                        <Button type="button" variant="outline" onClick={addType} disabled={!newName.trim()}>
                            <Plus className="mr-1 h-4 w-4" /> Aggiungi
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Il nuovo tipo vale per tutti gli stabilimenti.</p>
                </div>
            )}

            <DialogFooter>
                <Button type="button" onClick={save} disabled={busy}>{busy ? "Salvataggio..." : "Salva"}</Button>
            </DialogFooter>
            {confirmDialog}
            {promptDialog}
        </div>
    );
}
