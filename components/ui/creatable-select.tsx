"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useT } from "@/lib/i18n/client";

interface CreatableSelectProps {
    label: string;
    name: string;
    options: { id: string; label: string }[];
    onCreate: (label: string) => void;
    placeholder?: string;
    required?: boolean;
}

export function CreatableSelect({ label, name, options, onCreate, placeholder, required }: CreatableSelectProps) {
    const t = useT();
    const [isCreating, setIsCreating] = useState(false);
    const [newValue, setNewValue] = useState("");

    const handleCreate = () => {
        if (newValue.trim()) {
            onCreate(newValue.trim());
            setNewValue("");
            setIsCreating(false);
            // Ideally select the newly created item here, but for simplicity user selects it manually after
        }
    };

    if (isCreating) {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <div className="flex gap-2">
                    <input
                        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={t("Nuovo: {label}...", { label })}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleCreate}
                        className="inline-flex items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        {t("Aggiungi")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="inline-flex items-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted"
                    >
                        {t("Annulla")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label htmlFor={name} className="text-sm font-medium">{label}</label>
                <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                    <Plus className="h-3 w-3" /> {t("Aggiungi nuovo")}
                </button>
            </div>
            <select required={required} id={name} name={name} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="">{placeholder || t("Seleziona...")}</option>
                {options.map(opt => (
                    <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
