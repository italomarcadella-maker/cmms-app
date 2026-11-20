'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n/client';

export interface PlantChoice {
    id: string;
    name: string;
}

interface PlantPickerProps {
    plants: PlantChoice[];
    value: string[];
    onChange: (ids: string[]) => void;
    /** Per l'admin gli stabilimenti sono facoltativi: vede comunque tutto. */
    isAdminRole?: boolean;
}

/** Scelta degli stabilimenti visibili a un utente (uno o piu'). */
export function PlantPicker({ plants, value, onChange, isAdminRole }: PlantPickerProps) {
    const t = useT();
    const toggle = (id: string, checked: boolean) => {
        onChange(checked ? [...new Set([...value, id])] : value.filter(v => v !== id));
    };

    return (
        <div className="space-y-2">
            <Label>{t("Stabilimenti")}</Label>
            {isAdminRole ? (
                <p className="text-xs text-muted-foreground">{t("L'amministratore vede sempre tutti gli stabilimenti.")}</p>
            ) : (
                <>
                    <div className="rounded-md border p-2 space-y-1.5 max-h-40 overflow-auto">
                        {plants.length === 0 && <p className="text-xs text-muted-foreground">{t("Nessuno stabilimento definito.")}</p>}
                        {plants.map(p => (
                            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox checked={value.includes(p.id)} onCheckedChange={(c) => toggle(p.id, c === true)} />
                                {p.name}
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t("L'utente vedrà solo i dati degli stabilimenti selezionati. Un responsabile di plant può averne più di uno.")}
                    </p>
                </>
            )}
        </div>
    );
}
