"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordPlannedReading } from "@/modules/energy/adapters/actions/reading-plan-actions";

interface Props {
    meterId: string;
    unit: string;
    lastValue: number | null;
    lastReadAt: string | null;
    onDone: () => void;
}

/** Inserimento del valore letto su un contatore: usato dal calendario e dalla pagina Impianti. */
export function ReadingEntryForm({ meterId, unit, lastValue, lastReadAt, onDone }: Props) {
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        const n = Number(value.replace(",", "."));
        setBusy(true);
        const res = await recordPlannedReading(meterId, n);
        setBusy(false);
        if (!res.success) { toast.error(res.message); return; }
        if (res.isAnomaly) toast.warning(res.aiAnalysis ?? "Lettura registrata, ma il valore è anomalo.");
        else toast.success("Lettura registrata");
        setValue("");
        onDone();
    };

    return (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
            <Input
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Valore (${unit})`}
                className="h-8 w-[150px] text-sm"
                aria-label={`Valore letto in ${unit}`}
            />
            <Button size="sm" type="submit" disabled={busy || value.trim() === ""}>{busy ? "..." : "Registra lettura"}</Button>
            {lastValue !== null && (
                <span className="text-xs text-muted-foreground">
                    Ultima: {lastValue.toLocaleString("it-IT")} {unit}
                    {lastReadAt ? ` (${new Date(lastReadAt).toLocaleDateString("it-IT")})` : ""}
                </span>
            )}
        </form>
    );
}
