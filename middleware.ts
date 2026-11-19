import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicPath } from './lib/public-paths';
import { DESKTOP_COOKIE, DESKTOP_COOKIE_MAX_AGE, mobileRedirectAction } from './lib/mobile-redirect';

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

    // Quando si passa una funzione a auth(), il callback "authorized" non reindirizza piu': il controllo di accesso
    // va fatto qui. Senza, pagine e API risponderebbero anche a chi non ha effettuato il login.
    const isLoggedIn = !!request.auth?.user;
    const isPublic = isPublicPath(pathname);
    if (!isLoggedIn && !isPublic) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }
    // Prima password da cambiare: finche' non e' cambiata si puo' solo aprire la pagina di cambio e la disconnessione
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (isLoggedIn && (request.auth.user as any).mustChangePassword === true && !isPublic && pathname !== '/change-password') {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Devi prima cambiare la password' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/change-password', request.url));
    }
    if (isLoggedIn && pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Manutentore da smartphone: la pagina iniziale diventa la vista mobile. Con "Versione completa" (/?desktop=1) resta
    // sul desktop e la scelta si ricorda per 30 giorni. Vale solo per `/` e solo per questo ruolo (vedi lib/mobile-redirect.ts).
    if (isLoggedIn) {
        const action = mobileRedirectAction({
            pathname,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            role: (request.auth.user as any).role,
            userAgent: request.headers.get('user-agent'),
            desktopParam: request.nextUrl.searchParams.get('desktop'),
            desktopCookie: request.cookies.get(DESKTOP_COOKIE)?.value,
        });
        if (action === 'redirect') {
            return NextResponse.redirect(new URL('/mobile', request.url));
        }
        if (action === 'remember-desktop') {
            const response = NextResponse.next();
            response.cookies.set(DESKTOP_COOKIE, '1', {
                maxAge: DESKTOP_COOKIE_MAX_AGE,
                path: '/',
                sameSite: 'lax',
                httpOnly: true,
                secure: request.nextUrl.protocol === 'https:',
            });
            return response;
        }
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

