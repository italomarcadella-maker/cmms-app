"use client";

import React, { createContext, useContext } from "react";
import { User, UserRole } from "@/lib/types";

import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";

interface AuthContextType {
    user: User | null;
    login: () => void;
    logout: () => void;
    isAuthenticated: boolean;
    isSupervisor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthStateProvider>{children}</AuthStateProvider>
        </SessionProvider>
    );
}

function AuthStateProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const user = session?.user as User | null;

    const login = () => signIn();
    const logout = () => signOut({ callbackUrl: "/login" });

    // Compatibility helpers
    const isSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

    return (
        <AuthContext.Provider value={{
            user: user || null,
            login,
            logout,
            isAuthenticated: status === 'authenticated',
            isSupervisor
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
