import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from "@auth/prisma-adapter"

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    // AUTH_SECRET is required and validated at startup by lib/env.mjs (imported from next.config.mjs).
    // No fallback here on purpose: a hardcoded fallback would silently sign JWTs with a known
    // secret if the env validation were ever bypassed.
    secret: process.env.AUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(3) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await prisma.user.findUnique({ where: { email } });

                    if (!user || !user.password) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);

                    if (passwordsMatch) {
                        // Check if user is active
                        if (user.isActive === false) return null;

                        // Update last login
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { lastLogin: new Date() }
                        });

                        return user;
                    }
                }
                return null;
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
        async jwt({ token, user, trigger, session }: any) {
            if (user) {
                token.role = user.role;
                token.mustChangePassword = user.mustChangePassword;
                token.plantsCheckedAt = 0; // forza la lettura degli stabilimenti al primo accesso
            }
            if (trigger === "update" && session?.user) {
                token.role = session.user.role;
                token.mustChangePassword = session.user.mustChangePassword;
                token.plantsCheckedAt = 0;
            }

            // Ruolo e stabilimenti assegnati si rileggono dal database al massimo una volta al minuto:
            // una modifica dell'admin (o la disattivazione di un utente) vale entro pochi istanti,
            // senza una query per ogni richiesta.
            if (token.sub && (!token.plantsCheckedAt || Date.now() - token.plantsCheckedAt > 60_000)) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { role: true, isActive: true, plantId: true, plants: { select: { plantId: true } } },
                    });
                    if (!dbUser || dbUser.isActive === false) return null; // utente eliminato o disattivato: sessione chiusa
                    token.role = dbUser.role;
                    token.homePlantId = dbUser.plantId;
                    token.plantIds = dbUser.plants.map(p => p.plantId);
                    token.plantsCheckedAt = Date.now();
                } catch (err) {
                    console.error('[auth] Lettura stabilimenti non riuscita, uso i valori in sessione:', err);
                }
            }
            return token;
        }
    }
});
