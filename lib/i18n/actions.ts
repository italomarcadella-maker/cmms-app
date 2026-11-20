'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { requireLogin } from '@/lib/auth-guard';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from './config';

/**
 * Cambia la lingua dell'interfaccia. La scelta resta sul dispositivo (cookie) e, se l'utente e' collegato, viene salvata
 * anche sul suo profilo (serve per scrivergli le notifiche nella sua lingua). Funziona anche prima del login.
 */
export async function setLocale(locale: string): Promise<{ success: boolean }> {
    if (!isLocale(locale)) return { success: false };

    const store = await cookies();
    store.set(LOCALE_COOKIE, locale, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        httpOnly: false, // letto anche dal browser (selettore)
    });

    // Se c'e' una sessione, la scelta si salva sul profilo: solo il proprio
    const guard = await requireLogin();
    if (guard.authorized) {
        try {
            await prisma.user.update({ where: { id: guard.session.user.id }, data: { locale } });
        } catch (error) {
            console.error('[i18n] salvataggio lingua', error);
        }
    }
    return { success: true };
}
