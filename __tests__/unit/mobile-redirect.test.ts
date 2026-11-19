// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mobileRedirectAction, isMobileUserAgent } from '@/lib/mobile-redirect';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

describe('reindirizzamento del manutentore da smartphone', () => {
    it('riconosce i dispositivi mobili dallo user-agent', () => {
        expect(isMobileUserAgent(ANDROID)).toBe(true);
        expect(isMobileUserAgent(IPHONE)).toBe(true);
        expect(isMobileUserAgent('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)')).toBe(true);
        expect(isMobileUserAgent(DESKTOP)).toBe(false);
        expect(isMobileUserAgent('')).toBe(false);
        expect(isMobileUserAgent(null)).toBe(false);
    });

    it('un manutentore da smartphone che apre la radice va a /mobile', () => {
        expect(mobileRedirectAction({ pathname: '/', role: 'MAINTAINER', userAgent: ANDROID })).toBe('redirect');
        expect(mobileRedirectAction({ pathname: '/', role: 'MAINTAINER', userAgent: IPHONE })).toBe('redirect');
    });

    it('da computer non viene reindirizzato', () => {
        expect(mobileRedirectAction({ pathname: '/', role: 'MAINTAINER', userAgent: DESKTOP })).toBe('none');
    });

    it('gli altri ruoli non vengono mai reindirizzati', () => {
        for (const role of ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER', 'USER', undefined, null]) {
            expect(mobileRedirectAction({ pathname: '/', role, userAgent: ANDROID }), String(role)).toBe('none');
        }
    });

    it('solo la radice: le altre pagine restano com\'erano', () => {
        for (const p of ['/work-orders', '/work-orders/abc', '/mobile', '/mobile/orders/abc', '/login', '/api/work-orders', '/change-password', '/assets']) {
            expect(mobileRedirectAction({ pathname: p, role: 'MAINTAINER', userAgent: ANDROID }), p).toBe('none');
        }
    });

    it('con desktop=1 niente reindirizzamento e la scelta si ricorda', () => {
        expect(mobileRedirectAction({ pathname: '/', role: 'MAINTAINER', userAgent: ANDROID, desktopParam: '1' })).toBe('remember-desktop');
    });

    it('con il cookie della versione completa niente reindirizzamento', () => {
        expect(mobileRedirectAction({ pathname: '/', role: 'MAINTAINER', userAgent: ANDROID, desktopCookie: '1' })).toBe('none');
    });

    it('un valore diverso da 1 non disattiva il reindirizzamento', () => {
        expect(mobileRedirectAction({ pathname: '/', role: 'MAINTAINER', userAgent: ANDROID, desktopParam: '0', desktopCookie: '0' })).toBe('redirect');
        expect(mobileRedirectAction({ pathname: '/', role: 'MAINTAINER', userAgent: ANDROID, desktopParam: 'true' })).toBe('redirect');
    });

    it('il parametro non ricorda nulla per chi non e\' manutentore', () => {
        expect(mobileRedirectAction({ pathname: '/', role: 'SUPERVISOR', userAgent: ANDROID, desktopParam: '1' })).toBe('none');
    });
});
