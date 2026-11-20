"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePlant } from "@/lib/plant-context";
import { MAX_DESCRIPTION, MAX_ITEMS, MAX_QUANTITY } from "@/modules/inventory/domain/material-request";
import {
    createMaterialRequest, searchWarehouseParts,
    type WarehousePartHit,
} from "@/modules/inventory/adapters/actions/material-request-actions";

const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface Row {
    key: number;
    /** Articolo scelto dal magazzino; null = descrizione libera. */
    partId: string | null;
    available: number | null;
    text: string;
    quantity: string;
}

let rowKey = 0;
const newRow = (): Row => ({ key: ++rowKey, partId: null, available: null, text: "", quantity: "1" });

/** Finestra di dialogo il cui contenuto si monta solo quando e' aperta: ogni apertura riparte da un modulo pulito. */
function FormDialog({ trigger, title, description, children }: {
    trigger: ReactNode;
    title: string;
    description?: string;
    children: (close: () => void) => ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {open && children(() => setOpen(false))}
            </DialogContent>
        </Dialog>
    );
}

function Field({ id, label, children, hint }: { id?: string; label: string; children: ReactNode; hint?: string }) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

export function NewMaterialRequestDialog({ trigger, onSaved }: { trigger: ReactNode; onSaved: () => void }) {
    return (
        <FormDialog
            trigger={trigger}
            title="Nuova richiesta di materiale"
            description="Chiedi alla manutenzione il materiale di cui hai bisogno. Se l'articolo è nel magazzino manutenzione vedi subito quanti pezzi ci sono."
        >
            {(close) => <NewMaterialRequestForm onDone={() => { close(); onSaved(); }} />}
        </FormDialog>
    );
}

/** Modulo della richiesta di materiale: nella finestra della pagina Richieste di materiale e dentro "Nuova richiesta". */
export function NewMaterialRequestForm({ onDone }: { onDone: () => void }) {
    const { plants, activePlant } = usePlant();
    const [plantId, setPlantId] = useState(activePlant?.id ?? plants[0]?.id ?? "");
    const [department, setDepartment] = useState("");
    const [neededBy, setNeededBy] = useState("");
    const [note, setNote] = useState("");
    const [rows, setRows] = useState<Row[]>(() => [newRow()]);
    const [busy, setBusy] = useState(false);

    const update = (key: number, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
    const remove = (key: number) => setRows(rs => (rs.length > 1 ? rs.filter(r => r.key !== key) : rs));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const items = rows.map(r => ({
            partId: r.partId ?? undefined,
            description: r.partId ? undefined : r.text.trim(),
            quantity: Number(r.quantity.replace(",", ".")),
        }));
        if (items.some(i => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_QUANTITY)) {
            toast.error(`Le quantità devono essere numeri interi da 1 a ${MAX_QUANTITY}.`);
            return;
        }
        if (items.some(i => !i.partId && !i.description)) {
            toast.error("Ogni riga deve avere un materiale: cercalo nel magazzino o scrivilo a mano.");
            return;
        }
        setBusy(true);
        const res = await createMaterialRequest({
            plantId: plantId || undefined,
            department,
            neededBy: neededBy || undefined,
            note,
            items,
        });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <form onSubmit={submit} className="grid gap-4">
            {plants.length > 1 && (
                <Field label="Stabilimento">
                    <Select value={plantId} onValueChange={setPlantId}>
                        <SelectTrigger><SelectValue placeholder="Scegli lo stabilimento" /></SelectTrigger>
                        <SelectContent>{plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                </Field>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                <Field id="mr-dept" label="Reparto"><Input id="mr-dept" value={department} maxLength={80} onChange={(e) => setDepartment(e.target.value)} placeholder="Es. Estrusione" /></Field>
                <Field id="mr-needed" label="Entro quando serve" hint="Facoltativo"><Input id="mr-needed" type="date" min={todayKey()} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} /></Field>
            </div>

            <div className="grid gap-2">
                <Label>Materiale richiesto</Label>
                {rows.map((row, idx) => (
                    <ItemRow
                        key={row.key}
                        row={row}
                        index={idx}
                        plantId={plantId}
                        canRemove={rows.length > 1}
                        onChange={(patch) => update(row.key, patch)}
                        onRemove={() => remove(row.key)}
                    />
                ))}
                <div>
                    <Button type="button" variant="outline" size="sm" disabled={rows.length >= MAX_ITEMS} onClick={() => setRows(rs => [...rs, newRow()])}>
                        <Plus className="h-4 w-4" /> Aggiungi riga
                    </Button>
                </div>
            </div>

            <Field id="mr-note" label="Nota" hint="Per cosa serve, dove consegnarlo, riferimenti utili.">
                <Textarea id="mr-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>

            <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Invio..." : "Invia richiesta"}</Button></DialogFooter>
        </form>
    );
}

function ItemRow({ row, index, plantId, canRemove, onChange, onRemove }: {
    row: Row;
    index: number;
    plantId: string;
    canRemove: boolean;
    onChange: (patch: Partial<Row>) => void;
    onRemove: () => void;
}) {
    const [result, setResult] = useState<{ q: string; plantId: string; list: WarehousePartHit[] } | null>(null);
    const searching = !row.partId && row.text.trim().length >= 2;

    // Ricerca nel magazzino mentre si scrive (con una breve attesa per non interrogare a ogni tasto)
    useEffect(() => {
        if (!searching) return;
        let alive = true;
        const timer = setTimeout(async () => {
            const found = await searchWarehouseParts(row.text, plantId || undefined);
            if (alive) setResult({ q: row.text, plantId, list: found });
        }, 250);
        return () => { alive = false; clearTimeout(timer); };
    }, [row.text, searching, plantId]);

    // I risultati valgono solo per il testo e lo stabilimento con cui sono stati cercati
    const hits = result && result.q === row.text && result.plantId === plantId ? result.list : null;
    const qty = Number(row.quantity.replace(",", "."));
    const short = row.partId !== null && row.available !== null && Number.isFinite(qty) && qty > row.available;

    return (
        <div className="grid gap-1.5 rounded-md border border-border p-2.5">
            <div className="grid grid-cols-[1fr_5.5rem_auto] items-start gap-2">
                {row.partId ? (
                    <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-input bg-secondary px-3 text-sm">
                        <span className="min-w-0 break-words">
                            <span className="font-medium">{row.text}</span>
                            <span className="text-muted-foreground"> · disponibili {row.available ?? 0}</span>
                        </span>
                        <button type="button" aria-label="Cambia materiale" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => onChange({ partId: null, available: null })}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <Input
                        aria-label={`Materiale, riga ${index + 1}`}
                        value={row.text}
                        maxLength={MAX_DESCRIPTION}
                        placeholder="Cerca nel magazzino o scrivi cosa serve"
                        onChange={(e) => onChange({ text: e.target.value })}
                    />
                )}
                <Input
                    aria-label={`Quantità, riga ${index + 1}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_QUANTITY}
                    step={1}
                    value={row.quantity}
                    onChange={(e) => onChange({ quantity: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label="Rimuovi riga" disabled={!canRemove} onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {searching && hits && hits.length > 0 && (
                <ul className="max-h-44 overflow-y-auto rounded-md border border-border text-sm">
                    {hits.map(h => (
                        <li key={h.id}>
                            <button
                                type="button"
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent"
                                onClick={() => { onChange({ partId: h.id, available: h.available, text: h.name }); }}
                            >
                                <span className="min-w-0 break-words">{h.name}{h.location ? <span className="text-xs text-muted-foreground"> · {h.location}</span> : null}</span>
                                <span className={h.available > 0 ? "shrink-0 text-xs tabular-nums text-muted-foreground" : "shrink-0 text-xs font-medium text-critical-strong"}>
                                    {h.available > 0 ? `disponibili ${h.available}` : "esaurito"}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {searching && hits && hits.length === 0 && (
                <p className="text-xs text-muted-foreground">Nessun articolo uguale in magazzino: la riga resta come descrizione libera.</p>
            )}
            {short && <p className="text-xs text-warning-strong">Ne chiedi più di quelli disponibili ({row.available}): la manutenzione dovrà ordinarne altri.</p>}
        </div>
    );
}
