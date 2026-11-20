"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    createSkillType, getManagedSkillTypes, renameSkillType, setSkillTypeActive,
    type ManagedSkillType,
} from "@/modules/maintenance/adapters/actions/skill-matrix-actions";

/** Gestione dell'elenco delle competenze (aggiungi, rinomina, disattiva/riattiva). Le abilitazioni si gestiscono da Team tecnico. */
export function SkillTypesDialog({ trigger, onChanged }: {
    trigger: ReactNode;
    /** Chiamata dopo ogni modifica per ricaricare la matrice. */
    onChanged: () => void;
}) {
    const t = useT();
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{t("Gestisci competenze")}</DialogTitle>
                    <DialogDescription>
                        {t("Le competenze valgono per tutti gli stabilimenti. Disattivando una competenza i livelli già assegnati restano archiviati.")}
                    </DialogDescription>
                </DialogHeader>
                {open && <SkillTypesForm onChanged={onChanged} />}
            </DialogContent>
        </Dialog>
    );
}

function SkillTypesForm({ onChanged }: { onChanged: () => void }) {
    const t = useT();
    const [types, setTypes] = useState<ManagedSkillType[] | null>(null);
    const [newName, setNewName] = useState("");
    const [busy, setBusy] = useState(false);
    const { confirm, dialog: confirmDialog } = useConfirm();
    const { ask, dialog: promptDialog } = usePrompt();

    const [version, setVersion] = useState(0);
    useEffect(() => {
        let alive = true;
        getManagedSkillTypes()
            .then(list => { if (alive) setTypes(list); })
            .catch(e => { console.error(e); if (alive) setTypes([]); });
        return () => { alive = false; };
    }, [version]);

    const afterChange = async () => { setVersion(v => v + 1); onChanged(); };

    const add = async () => {
        if (!newName.trim() || busy) return;
        setBusy(true);
        const res = await createSkillType(newName);
        setBusy(false);
        if (res.success) { toast.success(res.message); setNewName(""); await afterChange(); } else toast.error(res.message);
    };

    const rename = async (st: ManagedSkillType) => {
        const name = await ask({ title: t("Rinomina la competenza"), label: t("Nome"), defaultValue: st.name, required: true, confirmLabel: t("Salva") });
        if (name === null) return;
        const res = await renameSkillType(st.id, name);
        if (res.success) { toast.success(res.message); await afterChange(); } else toast.error(res.message);
    };

    const deactivate = async (st: ManagedSkillType) => {
        const yes = await confirm({
            title: t("Disattivare «{name}»?", { name: st.name }),
            description: t("La competenza non comparirà più nella matrice. I livelli già assegnati restano archiviati e si recuperano riattivandola."),
            confirmLabel: t("Disattiva"),
            variant: "destructive",
        });
        if (!yes) return;
        const res = await setSkillTypeActive(st.id, false);
        if (res.success) { toast.success(res.message); await afterChange(); } else toast.error(res.message);
    };

    const reactivate = async (st: ManagedSkillType) => {
        const res = await setSkillTypeActive(st.id, true);
        if (res.success) { toast.success(res.message); await afterChange(); } else toast.error(res.message);
    };

    return (
        <div className="grid gap-4">
            {types === null ? (
                <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p>
            ) : types.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Nessuna competenza definita.")}</p>
            ) : (
                <ul className="grid gap-2">
                    {types.map(st => (
                        <li key={st.id} className="flex items-center gap-2 rounded-md border p-2.5">
                            <span className={st.isActive ? "flex-1 text-sm font-medium" : "flex-1 text-sm text-muted-foreground line-through"}>{st.name}</span>
                            {!st.isActive && <Badge variant="neutral">{t("Disattivata")}</Badge>}
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t("Rinomina")} aria-label={t("Rinomina {name}", { name: st.name })} onClick={() => rename(st)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {st.isActive ? (
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t("Disattiva")} aria-label={t("Disattiva {name}", { name: st.name })} onClick={() => deactivate(st)}>
                                    <EyeOff className="h-3.5 w-3.5" />
                                </Button>
                            ) : (
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t("Riattiva")} aria-label={t("Riattiva {name}", { name: st.name })} onClick={() => reactivate(st)}>
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <div className="grid gap-1.5 border-t pt-4">
                <Label htmlFor="skill-new">{t("Aggiungi una competenza")}</Label>
                <div className="flex gap-2">
                    <Input
                        id="skill-new"
                        value={newName}
                        maxLength={80}
                        placeholder={t("Es. Robotica")}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    />
                    <Button type="button" variant="outline" onClick={add} disabled={!newName.trim() || busy}>
                        <Plus className="mr-1 h-4 w-4" /> {t("Aggiungi")}
                    </Button>
                </div>
            </div>
            {confirmDialog}
            {promptDialog}
        </div>
    );
}
