"use client";

import { useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
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
    const t = useT();
    const fmt = useFormat();
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        const n = Number(value.replace(",", "."));
        setBusy(true);
        const res = await recordPlannedReading(meterId, n);
        setBusy(false);
        if (!res.success) { toast.error(res.message); return; }
        if (res.isAnomaly) toast.warning(res.aiAnalysis ?? t("Lettura registrata, ma il valore è anomalo."));
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
                placeholder={t("Valore ({unit})", { unit })}
                className="h-8 w-[150px] text-sm"
                aria-label={t("Valore letto in {unit}", { unit })}
            />
            <Button size="sm" type="submit" disabled={busy || value.trim() === ""}>{busy ? "..." : t("Registra lettura")}</Button>
            {lastValue !== null && (
                <span className="text-xs text-muted-foreground">
                    {t("Ultima: {value} {unit}", { value: fmt.number(lastValue), unit })}
                    {lastReadAt ? ` (${fmt.date(lastReadAt)})` : ""}
                </span>
            )}
        </form>
    );
}
