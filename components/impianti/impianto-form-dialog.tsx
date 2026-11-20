"use client";

import { useState, type ReactNode } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePlant } from "@/lib/plant-context";
import { addAsset } from "@/lib/actions";
import { useAssets } from "@/lib/assets-context";

/**
 * Crea un impianto tecnologico (un asset di tipo "impianto/struttura"). Gli impianti si raggruppano per nome:
 * piu' componenti con lo stesso nome di impianto (es. "Aria compressa") compaiono insieme nella stessa scheda.
 */
export function ImpiantoFormDialog({ trigger, existingNames, defaultImpianto, onSaved }: {
    trigger: ReactNode;
    /** Nomi degli impianti gia' presenti, suggeriti durante la digitazione */
    existingNames: string[];
    /** Per aggiungere un componente a un impianto esistente */
    defaultImpianto?: string;
    onSaved: () => void;
}) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const adding = !!defaultImpianto;
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{adding ? t("Aggiungi un componente a «{name}»", { name: defaultImpianto ?? "" }) : t("Nuovo impianto")}</DialogTitle>
                    <DialogDescription>
                        {adding
                            ? t("Il componente (per esempio un compressore o un essiccatore) comparirà nella scheda di questo impianto.")
                            : t("Per esempio «Aria compressa» o «Cabina elettrica». Potrai poi aggiungere i componenti, le manutenzioni, i contatori e le ditte a contratto.")}
                    </DialogDescription>
                </DialogHeader>
                {open && <Form existingNames={existingNames} defaultImpianto={defaultImpianto} onDone={() => { setOpen(false); onSaved(); }} />}
            </DialogContent>
        </Dialog>
    );
}

function Form({ existingNames, defaultImpianto, onDone }: { existingNames: string[]; defaultImpianto?: string; onDone: () => void }) {
    const t = useT();
    const { plants, activePlant } = usePlant();
    // L'elenco e l'albero degli asset sono in memoria e si aggiornano ogni 2 minuti: dopo aver creato l'impianto si aggiornano subito
    const { refreshAssets } = useAssets();
    const adding = !!defaultImpianto;
    const [impianto, setImpianto] = useState(defaultImpianto ?? "");
    const [name, setName] = useState("");
    const [plantId, setPlantId] = useState(activePlant?.id ?? plants[0]?.id ?? "");
    const [location, setLocation] = useState("");
    const [model, setModel] = useState("");
    const [serial, setSerial] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const group = impianto.trim();
        // Per un nuovo impianto il nome dell'impianto e' anche il nome del componente, salvo che l'utente ne indichi uno diverso
        const assetName = (adding ? name : name.trim() || group).trim();
        if (!group || !assetName) { toast.error(t("Indica il nome dell'impianto.")); return; }
        if (plants.length > 1 && !plantId) { toast.error(t("Scegli lo stabilimento.")); return; }
        setBusy(true);
        const res = await addAsset({
            name: assetName,
            line: group,
            // Nell'albero degli asset gli impianti stanno nel reparto "Impianti", separati dalle linee di produzione
            department: "Impianti",
            type: "FACILITY",
            location: location.trim() || "Non indicata",
            model: model.trim() || "Non indicato",
            // La matricola e' un identificativo interno: se non c'e' si genera una sigla univoca
            serialNumber: serial.trim() || `IMP-${Date.now().toString(36).toUpperCase()}`,
            plant: plantId || undefined,
            status: "OPERATIONAL",
        });
        setBusy(false);
        if (res.success) { toast.success(adding ? t("Componente aggiunto.") : t("Impianto creato.")); await refreshAssets(); onDone(); } else toast.error(res.message ?? t("Operazione non riuscita."));
    };

    const listId = "impianti-existing";
    return (
        <form onSubmit={submit} className="grid gap-3">
            {plants.length > 1 && (
                <div className="grid gap-1.5">
                    <Label>{t("Stabilimento")}</Label>
                    <Select value={plantId} onValueChange={setPlantId}>
                        <SelectTrigger><SelectValue placeholder={t("Scegli lo stabilimento")} /></SelectTrigger>
                        <SelectContent>{plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid gap-1.5">
                <Label htmlFor="i-group">{t("Impianto")}</Label>
                <Input id="i-group" list={listId} value={impianto} onChange={(e) => setImpianto(e.target.value)} placeholder={t("Es. Aria compressa")} required readOnly={adding} />
                <datalist id={listId}>{existingNames.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="i-name">{adding ? t("Componente") : t("Componente principale (facoltativo)")}</Label>
                <Input id="i-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={adding ? t("Es. Compressore 2") : t("Se vuoto, usa il nome dell'impianto")} required={adding} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label htmlFor="i-loc">{t("Posizione")}</Label><Input id="i-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Es. Locale tecnico")} /></div>
                <div className="grid gap-1.5"><Label htmlFor="i-model">{t("Modello")}</Label><Input id="i-model" value={model} onChange={(e) => setModel(e.target.value)} /></div>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="i-serial">{t("Matricola")}</Label>
                <Input id="i-serial" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder={t("Se vuota ne viene generata una interna")} />
            </div>
            <DialogFooter><Button type="submit" disabled={busy}>{busy ? t("Salvataggio...") : t("Salva")}</Button></DialogFooter>
        </form>
    );
}
