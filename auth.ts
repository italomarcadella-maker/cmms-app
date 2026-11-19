import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from "@auth/prisma-adapter"

/** Dopo questi tentativi falliti l'account si blocca per qualche minuto (protezione dai tentativi ripetuti). */
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Hash di confronto: se l'email non esiste si esegue comunque un confronto, cosi' i tempi di risposta non rivelano quali email sono registrate
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8q8o5Zq3d0R0n8c5s0y0oQ0m0g0l0e';

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    // Sessione di 12 ore, rinnovata con l'uso: un token rubato o un PC dimenticato non restano validi per settimane
    session: { strategy: "jwt", maxAge: 12 * 60 * 60, updateAge: 60 * 60 },
    // AUTH_SECRET is required and validated at startup by lib/env.mjs (imported from next.config.mjs).
    // No fallback here on purpose: a hardcoded fallback would silently sign JWTs with a known
    // secret if the env validation were ever bypassed.
    secret: process.env.AUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
    providers: [
        Credentials({
            async authorize(credentials) {
                // Il login accetta anche le password piu' brevi gia' esistenti (chi ne ha una debole deve poter entrare per cambiarla);
                // le regole di robustezza si applicano quando la password viene impostata (lib/password-policy.ts)
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(1).max(256) })
                    .safeParse(credentials);

                if (!parsedCredentials.success) return null;
                const { email, password } = parsedCredentials.data;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.password) {
                    await bcrypt.compare(password, DUMMY_HASH);
                    return null;
                }
                if (user.isActive === false) return null;
                if (user.lockedUntil && user.lockedUntil > new Date()) return null;

                const passwordsMatch = await bcrypt.compare(password, user.password);

                if (!passwordsMatch) {
                    const failed = (user.failedLogins ?? 0) + 1;
                    const lock = failed >= MAX_FAILED_LOGINS;
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
                    });
                    return null;
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date(), failedLogins: 0, lockedUntil: null },
                });
                return user;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }: { session: any, token: any }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            if (token.role && session.user) {
                session.user.role = token.role;
            }
            if (session.user) {
                session.user.mustChangePassword = token.mustChangePassword;
                session.user.plantIds = token.plantIds ?? [];
                session.user.homePlantId = token.homePlantId ?? null;
            }
            return session;
        },
        async jwt({ token, user, trigger }: any) {
            if (user) {
                token.role = user.role;
                token.mustChangePassword = user.mustChangePassword;
                token.plantsCheckedAt = 0; // forza la lettura degli stabilimenti al primo accesso
            }
            // Un aggiornamento chiesto dal browser NON porta valori: serve solo a rileggere i dati reali dal database
            // (cosi' il browser non puo' dichiarare da solo un ruolo diverso)
            if (trigger === "update") token.plantsCheckedAt = 0;

            // Ruolo, obbligo di cambio password e stabilimenti assegnati si rileggono dal database al massimo una volta
            // al minuto: una modifica dell'admin (o la disattivazione di un utente) vale entro pochi istanti,
            // senza una query per ogni richiesta.
            if (token.sub && (!token.plantsCheckedAt || Date.now() - token.plantsCheckedAt > 60_000)) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { role: true, isActive: true, mustChangePassword: true, plantId: true, plants: { select: { plantId: true } } },
                    });
                    if (!dbUser || dbUser.isActive === false) return null; // utente eliminato o disattivato: sessione chiusa
                    token.role = dbUser.role;
                    token.mustChangePassword = dbUser.mustChangePassword;
                    token.homePlantId = dbUser.plantId;
                    token.plantIds = dbUser.plants.map(p => p.plantId);
                    token.plantsCheckedAt = Date.now();
                } catch (err) {
                    console.error('[auth] Lettura dei dati utente non riuscita, uso i valori in sessione:', err);
                }
            }
            return token;
        }
    }
});
