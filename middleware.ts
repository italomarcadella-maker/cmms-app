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

// Percorsi raggiungibili senza accesso: login, endpoint di autenticazione, controllo di salute (monitoraggio),
// cron (protetto dal proprio segreto), risorse statiche.
const PUBLIC_PREFIXES = ['/login', '/api/auth', '/api/health', '/api/cron', '/_next'];
const PUBLIC_FILE = /\.(png|jpe?g|svg|ico|webp|json|js|css|woff2?|otf|ttf|txt|xml|webmanifest)$/i;

export default authMiddleware((request: any) => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const { pathname } = request.nextUrl;

    // Quando si passa una funzione a auth(), il callback "authorized" non reindirizza piu': il controllo di accesso
    // va fatto qui. Senza, pagine e API risponderebbero anche a chi non ha effettuato il login.
    const isLoggedIn = !!request.auth?.user;
    const isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) || PUBLIC_FILE.test(pathname);
    if (!isLoggedIn && !isPublic) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }
    if (isLoggedIn && pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

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

