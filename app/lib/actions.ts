'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', Object.fromEntries(formData));
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function updateUserPassword(userId: string, newPassword: string) {
    const session = await auth();

    // Check if user is authenticated and is an ADMIN
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        revalidatePath('/users');
        return { success: true, message: 'Password aggiornata con successo' };
    } catch (error) {
        console.error('Failed to update password:', error);
        return { success: false, message: 'Errore durante l\'aggiornamento della password' };
    }
}

export async function updateUserRole(userId: string, newRole: string) {
    const session = await auth();

    // Check if user is authenticated and is an ADMIN
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        });

        revalidatePath('/users');
        return { success: true, message: 'Ruolo aggiornato con successo' };
    } catch (error) {
        console.error('Failed to update role:', error);
        return { success: false, message: 'Errore durante l\'aggiornamento del ruolo' };
    }
}

export async function createUser(rawUserData: any) {
    const session = await auth();

    // Check if user is authenticated and is an ADMIN
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }

    try {
        const { name, email, password, role } = rawUserData;

        if (!email || !password || !role) {
            return { success: false, message: 'Dati mancanti.' };
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return { success: false, message: 'Utente già esistente con questa email.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                image: '', // Optional default image
                mustChangePassword: true
            }
        });

        revalidatePath('/users');
        return { success: true, message: 'Utente creato con successo' };
    } catch (error) {
        console.error('Failed to create user:', error);
        return { success: false, message: `Errore durante la creazione dell'utente: ${(error as any).message}` };
    }
}

export async function updateFirstLoginPassword(newPassword: string) {
    const session = await auth();

    if (!session?.user?.email) {
        return { success: false, message: 'Non autenticato.' };
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        // We can't easily force signOut/signIn here server-side in a way that refreshes the session instantly for middleware
        // But the middleware checks DB or token. 
        // Best approach: Client will redirect to dashboard, and middleware will now let them pass.

        return { success: true, message: 'Password aggiornata con successo' };
    } catch (error) {
        console.error('Failed to update first login password:', error);
        return { success: false, message: 'Errore durante l\'aggiornamento della password' };
    }
}

export async function getUsers() {
    const session = await auth();

    // Check if user is authenticated and is an ADMIN
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true
            }
        });
        return users;
    } catch (error) {
        console.error('Failed to fetch users:', error);
        throw new Error('Failed to fetch users');
    }
}
