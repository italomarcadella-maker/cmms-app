/**
 * Reindirizzamento del manutentore da smartphone verso la vista mobile. Funzione pura, usata dal middleware.
 *
 * Solo la pagina iniziale `/` e solo per il ruolo MAINTAINER. Chi sceglie la "Versione completa" (`/?desktop=1`)
 * non viene piu' reindirizzato: la scelta si ricorda per 30 giorni con un cookie scritto dal middleware.
 */
export const DESKTOP_COOKIE = 'cmms_desktop';
export const DESKTOP_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 giorni, in secondi

const MOBILE_UA = /Android|iPhone|iPad|Mobile/i;

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
    return !!userAgent && MOBILE_UA.test(userAgent);
}

export type MobileRedirectAction = 'none' | 'redirect' | 'remember-desktop';

export function mobileRedirectAction(input: {
    pathname: string;
    role?: string | null;
    userAgent?: string | null;
    /** Valore del parametro `desktop` nell'indirizzo. */
    desktopParam?: string | null;
    /** Valore del cookie di scelta della versione completa. */
    desktopCookie?: string | null;
}): MobileRedirectAction {
    if (input.pathname !== '/') return 'none';
    if (input.role !== 'MAINTAINER') return 'none';
    if (input.desktopParam === '1') return 'remember-desktop';
    if (input.desktopCookie === '1') return 'none';
    return isMobileUserAgent(input.userAgent) ? 'redirect' : 'none';
}
