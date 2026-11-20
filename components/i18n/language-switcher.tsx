"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import { setLocale } from "@/lib/i18n/actions";
import { toast } from "@/lib/i18n/toast";

/**
 * Cambio lingua: salva la scelta (cookie e, se collegato, profilo) e ricarica i dati della pagina nella nuova lingua.
 * `change` si usa per costruire menu personalizzati (es. dentro il menu utente); LanguageSelect e' la versione pronta.
 */
export function useLanguageChange() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const locale = useLocale();

    const change = (next: Locale) => {
        if (next === locale) return;
        startTransition(async () => {
            const res = await setLocale(next);
            if (!res.success) {
                toast.error("Lingua non valida");
                return;
            }
            router.refresh();
        });
    };

    return { locale, change, pending, options: LOCALES.map(l => ({ value: l, label: LOCALE_INFO[l].label })) };
}

/** Selettore della lingua con le lingue scritte nella loro lingua (Italiano, English, Français, Polski, 中文). */
export function LanguageSelect({ className }: { className?: string }) {
    const t = useT();
    const { locale, change, pending, options } = useLanguageChange();
    return (
        <label className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground ${className ?? ""}`}>
            <Globe className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t("Lingua")}</span>
            <select
                value={locale}
                disabled={pending}
                onChange={(e) => change(e.target.value as Locale)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("Lingua")}
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </label>
    );
}
