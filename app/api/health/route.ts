import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Tenta una query semplice al database
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ status: 'ok', database: 'connected' }, { status: 200 });
    } catch (error: any) {
        console.error('Health Check Failed:', error);
        return NextResponse.json(
            { status: 'error', database: 'disconnected', error: error.message },
            { status: 500 }
        );
    }
}
