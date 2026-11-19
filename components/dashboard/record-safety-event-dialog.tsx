"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePlant } from "@/lib/plant-context";
import {
    recordSafetyEvent, deleteSafetyEvent, type SafetyCounter, type SafetyEventType,
} from "@/modules/maintenance/adapters/actions/safety-actions";

const TYPE_LABEL: Record<SafetyEventType, string> = { INJURY: "Infortunio", NEAR_MISS: "Quasi incidente", HAZARD: "Situazione pericolosa" };
const todayKey = () => new Date().toISOString().slice(0, 10);

/** Registro degli eventi di sicurezza: aggiunta e storico recente. Niente nomi ne' dati sanitari delle persone. */
export function RecordSafetyEventDialog({ data }: { data: SafetyCounter }) {
    const router = useRouter();
    const { plants, activePlant } = usePlant();
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Registra evento</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Eventi di sicurezza</DialogTitle>
                    <DialogDescription>
                        Il contatore conta i giorni dall&apos;ultimo infortunio. Non inserire nomi o informazioni sanitarie delle persone coinvolte.
                    </DialogDescription>
                </DialogHeader>
                {open && (
                    <EventForm
                        data={data}
                        plants={plants}
                        defaultPlantId={activePlant?.id ?? plants[0]?.id}
                        onSaved={() => { router.refresh(); }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function EventForm({ data, plants, defaultPlantId, onSaved }: {
    data: SafetyCounter;
    plants: { id: string; name: string }[];
    defaultPlantId?: string;
    onSaved: () => void;
}) {
    const [type, setType] = useState<SafetyEventType>("INJURY");
    const [date, setDate] = useState(todayKey());
    const [note, setNote] = useState("");
    const [plantId, setPlantId] = useState(defaultPlantId ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await recordSafetyEvent({ type, occurredAt: `${date}T12:00:00`, description: note, plantId: plantId || undefined });
        setBusy(false);
        if (res.success) { toast.success(res.message); setNote(""); onSaved(); } else toast.error(res.message);
    };

    const remove = async (id: string) => {
        const res = await deleteSafetyEvent(id);
        if (res.success) { toast.success(res.message); onSaved(); } else toast.error(res.message);
    };

    return (
        <div className="grid gap-4">
            <form onSubmit={submit} className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                        <Label>Tipo</Label>
                        <Select value={type} onValueChange={(v) => setType(v as SafetyEventType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(Object.keys(TYPE_LABEL) as SafetyEventType[]).map(t => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="ev-date">Data</Label>
                        <Input id="ev-date" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                </div>
                {plants.length > 1 && (
                    <div className="grid gap-1.5">
                        <Label>Stabilimento</Label>
                        <Select value={plantId} onValueChange={setPlantId}>
                            <SelectTrigger><SelectValue placeholder="Scegli lo stabilimento" /></SelectTrigger>
                            <SelectContent>{plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
                <div className="grid gap-1.5">
                    <Label htmlFor="ev-note">Nota (facoltativa)</Label>
                    <Textarea id="ev-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. taglio lieve durante la sostituzione di una guarnizione" />
                </div>
                <Button type="submit" disabled={busy}>{busy ? "Salvataggio..." : "Registra"}</Button>
            </form>

            {data.recent.length > 0 && (
                <div className="space-y-1">
                    <p className="text-sm font-medium">Ultimi eventi</p>
                    <ul className="divide-y rounded-md border text-sm">
                        {data.recent.map(ev => (
                            <li key={ev.id} className="flex items-start justify-between gap-2 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={ev.type === "INJURY" ? "critical" : ev.type === "NEAR_MISS" ? "warning" : "neutral"}>{TYPE_LABEL[ev.type]}</Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(ev.occurredAt).toLocaleDateString("it-IT")} · {ev.plantName}</span>
                                    </div>
                                    {ev.description && <p className="mt-1 text-xs text-muted-foreground">{ev.description}</p>}
                                </div>
                                {data.canDelete && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => remove(ev.id)} aria-label="Elimina evento">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
