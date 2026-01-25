import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Attempt a simple query
        const userCount = await prisma.user.count();

        return NextResponse.json({
            status: 'ok',
            message: 'Database connection successful',
            userCount,
            envRef: process.env.DATABASE_URL ? 'Defined' : 'Undefined'
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack,
            name: error.name
        }, { status: 500 });
    }
}
