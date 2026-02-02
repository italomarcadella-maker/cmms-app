import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            console.log(`[AUTH-DEBUG] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}`);

            // Allow static files and API auth routes explicitly
            if (nextUrl.pathname.startsWith('/_next') ||
                nextUrl.pathname.startsWith('/static') ||
                nextUrl.pathname.startsWith('/api/auth') ||
                nextUrl.pathname.endsWith('.html') ||
                nextUrl.pathname.endsWith('.ico')) {
                return true;
            }

            const isLoginPage = nextUrl.pathname.startsWith('/login');

            if (isLoginPage) {
                if (isLoggedIn) {
                    console.log(`[AUTH-DEBUG] Redirecting logged in user from login to /`);
                    return Response.redirect(new URL('/', nextUrl));
                }
                return true;
            }

            // Require login for all other routes
            if (!isLoggedIn) {
                console.log(`[AUTH-DEBUG] Redirecting unauthenticated user to /login`);
                return false; // Redirect to login
            }

            return true;
        },
    },
    providers: [], // Configured in auth.ts
    trustHost: true,
} satisfies NextAuthConfig;
