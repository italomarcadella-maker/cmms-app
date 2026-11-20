"use client";

import Link from "next/link";
import { Check, KeyRound, LogOut, Settings } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { useLanguageChange } from "@/components/i18n/language-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<string, string> = {
    ADMIN: tk("Amministratore"),
    SUPERVISOR: tk("Supervisore"),
    MAINTAINER: tk("Manutentore"),
    PROCESS_ENGINEER: tk("Ingegnere di processo"),
    USER: tk("Utente"),
};

function initials(name?: string | null, email?: string | null) {
    const source = (name || email || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function UserMenu() {
    const t = useT();
    const { user, logout } = useAuth();
    const { locale, change, pending, options } = useLanguageChange();
    const name = user?.name || t("Utente");
    const role = user?.role ? t(ROLE_LABELS[user.role] ?? user.role) : "";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={t("Menu utente")}
                    className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                            {initials(user?.name, user?.email)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[140px] truncate text-sm font-medium sm:block">{name}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-0.5 pb-2">
                    <span className="block text-sm font-semibold text-foreground">{name}</span>
                    {user?.email && <span className="block truncate font-normal">{user.email}</span>}
                    {role && <span className="block font-normal">{role}</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                        <Link href="/settings">
                            <Settings /> {t("Impostazioni")}
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link href="/change-password">
                        <KeyRound /> {t("Cambia password")}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("Lingua")}</DropdownMenuLabel>
                {options.map((o) => (
                    <DropdownMenuItem key={o.value} disabled={pending} onSelect={() => change(o.value)}>
                        <span className="flex-1">{o.label}</span>
                        {o.value === locale && <Check aria-label={t("Lingua attiva")} />}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => logout()}>
                    <LogOut /> {t("Esci")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
