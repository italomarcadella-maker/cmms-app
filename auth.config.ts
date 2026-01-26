import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = true;
            const isLoginPage = nextUrl.pathname.startsWith('/login');
            const isChangePasswordPage = nextUrl.pathname.startsWith('/change-password');
            const isApiAuth = nextUrl.pathname.startsWith('/api/auth');

            if (isApiAuth) return true;

            if (isLoginPage) {
                if (isLoggedIn) {
                    return Response.redirect(new URL('/', nextUrl));
                }
                return true;
            }

            if (isLoggedIn) {
                // Check if user must change password
                const mustChangePassword = (auth.user as any).mustChangePassword;

                if (mustChangePassword) {
                    if (!isChangePasswordPage) {
                        return Response.redirect(new URL('/change-password', nextUrl));
                    }
                    return true;
                }

                // If user is validated but tries to go to change-password, redirect to dashboard?
                // Optional: allow them to stay if they want, but usually better to redirect out.
                if (isChangePasswordPage && !mustChangePassword) {
                    return Response.redirect(new URL('/', nextUrl));
                }

                // REDIRECT RULE: 'USER' role should always go to /requests/new instead of Dashboard
                const userRole = (auth.user as any).role;
                if (userRole === 'USER' && nextUrl.pathname === '/') {
                    return Response.redirect(new URL('/requests/new', nextUrl));
                }

                return true;
            }

            if (isOnDashboard) {
                return false; // Redirect unauthenticated users to login page
            }
            return true;
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
