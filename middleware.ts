import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const authMiddleware = NextAuth(authConfig).auth;

// Simple in-memory storage for rate limiting.
// IP -> Map of Endpoint -> Array of timestamps
const rateLimitMap = new Map<string, Map<string, number[]>>();

const LIMIT = 20; // Max 20 requests
const WINDOW_MS = 60 * 1000; // per 1 minute

// Target expensive API endpoints
const EXPENSIVE_ROUTES = [
    '/api/daily-meetings', // captures [id]/ai-briefing
    '/api/anomalies',      // captures auto-rca and predict
    '/api/sops/kaizen',
    '/api/scheduler'
];

export default authMiddleware((request: any) => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const { pathname } = request.nextUrl;

    // Check if the current request is for an expensive API endpoint
    const isExpensive = EXPENSIVE_ROUTES.some(route => pathname.startsWith(route));

    if (isExpensive) {
        let clientLimits = rateLimitMap.get(ip);
        if (!clientLimits) {
            clientLimits = new Map<string, number[]>();
            rateLimitMap.set(ip, clientLimits);
        }

        let timestamps = clientLimits.get(pathname);
        if (!timestamps) {
            timestamps = [];
            clientLimits.set(pathname, timestamps);
        }

        const now = Date.now();
        // Filter out expired timestamps
        timestamps = timestamps.filter(time => now - time < WINDOW_MS);
        clientLimits.set(pathname, timestamps);

        if (timestamps.length >= LIMIT) {
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests. Please try again later.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        timestamps.push(now);
    }
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};

