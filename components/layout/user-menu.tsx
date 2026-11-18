"use client";

import Link from "next/link";
import { KeyRound, LogOut, Settings } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
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
    ADMIN: "Amministratore",
    SUPERVISOR: "Supervisore",
    MAINTAINER: "Manutentore",
    PROCESS_ENGINEER: "Ingegnere di processo",
    USER: "Utente",
};

function initials(name?: string | null, email?: string | null) {
    const source = (name || email || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function UserMenu() {
    const { user, logout } = useAuth();
    const name = user?.name || "Utente";
    const role = user?.role ? ROLE_LABELS[user.role] ?? user.role : "";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Menu utente"
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
                            <Settings /> Impostazioni
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link href="/change-password">
                        <KeyRound /> Cambia password
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => logout()}>
                    <LogOut /> Esci
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
