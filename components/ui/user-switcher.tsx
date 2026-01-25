"use client";

import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/types";
import { Shield, ShieldAlert, User as UserIcon, LogOut } from "lucide-react";
import { useState } from "react";

export function UserSwitcher() {
    const { user, switchUser, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
            <div
                className="bg-card border shadow-lg rounded-full p-2 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                    ${user.role === 'ADMIN' ? 'bg-red-500' : user.role === 'SUPERVISOR' ? 'bg-amber-500' : 'bg-blue-500'}
                `}>
                    {user.avatar}
                </div>
                {isOpen && <span className="text-xs font-medium pr-2">{user.name} ({user.role})</span>}
            </div>

            {isOpen && (
                <div className="bg-card border shadow-lg rounded-lg p-2 flex flex-col gap-1 w-48 mb-2 animate-in slide-in-from-bottom-5">
                    <div className="text-xs text-muted-foreground font-semibold px-2 py-1 uppercase">Switch Role</div>
                    <button
                        onClick={() => switchUser('ADMIN')}
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted ${user.role === 'ADMIN' ? 'bg-muted' : ''}`}
                    >
                        <ShieldAlert className="h-3 w-3 text-red-500" /> Admin
                    </button>
                    <button
                        onClick={() => switchUser('SUPERVISOR')}
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted ${user.role === 'SUPERVISOR' ? 'bg-muted' : ''}`}
                    >
                        <Shield className="h-3 w-3 text-amber-500" /> Supervisor
                    </button>
                    <button
                        onClick={() => switchUser('USER')}
                        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted ${user.role === 'USER' ? 'bg-muted' : ''}`}
                    >
                        <UserIcon className="h-3 w-3 text-blue-500" /> Tech/User
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-destructive/10 text-destructive"
                    >
                        <LogOut className="h-3 w-3" /> Logout
                    </button>
                </div>
            )}
        </div>
    );
}
