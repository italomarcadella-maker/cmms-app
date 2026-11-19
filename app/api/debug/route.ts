import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Diagnostica della connessione al database. Solo amministratori; nessuna traccia di errore in risposta. */
export async function GET() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json({ status: 'forbidden' }, { status: 403 });
    }
    try {
        const userCount = await prisma.user.count();
        return NextResponse.json({ status: 'ok', message: 'Database connection successful', userCount });
    } catch (error: any) {
        console.error('[debug] connessione al database non riuscita:', error);
        return NextResponse.json({ status: 'error', message: 'Connessione al database non riuscita' }, { status: 500 });
    }
}
