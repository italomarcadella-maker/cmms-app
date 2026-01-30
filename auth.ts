import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PrismaAdapter } from "@auth/prisma-adapter"

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
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
                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            if (token.role && session.user) {
                session.user.role = token.role;
            }
            if (session.user) {
                session.user.mustChangePassword = token.mustChangePassword;
            }
            return session;
        },
        async jwt({ token }) {
            if (token.sub) {
                const user = await prisma.user.findUnique({ where: { id: token.sub } });
                if (user) {
                    token.role = user.role;
                    token.mustChangePassword = user.mustChangePassword;
                }
            }
            return token;
        }
    }
});
