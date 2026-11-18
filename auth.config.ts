import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

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
                    return Response.redirect(new URL('/', nextUrl));
                }
                return true;
            }

            // Require login for all other routes
            if (!isLoggedIn) {
                return false; // Redirect to login
            }

            return true;
        },
    },
    providers: [], // Configured in auth.ts
    trustHost: true,
} satisfies NextAuthConfig;
