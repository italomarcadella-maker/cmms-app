/**
 * Percorsi raggiungibili senza aver fatto il login. Elenco stretto e verificabile: nessun controllo "per estensione",
 * che lascerebbe passare anche pagine dinamiche il cui ultimo segmento finisce in .png o .js.
 * Funzione pura, usata dal middleware.
 */
const PUBLIC_PREFIXES = ['/login', '/api/auth', '/api/health', '/api/cron', '/_next/', '/brand/'];
const PUBLIC_EXACT = new Set(['/favicon.ico', '/icon.svg', '/manifest.json', '/sw.js', '/robots.txt']);

export function isPublicPath(pathname: string): boolean {
    if (PUBLIC_EXACT.has(pathname)) return true;
    // File generati da next-pwa nella radice: workbox-<hash>.js e il worker personalizzato delle notifiche push, worker-<hash>.js
    if (/^\/(workbox|worker)-[A-Za-z0-9]+\.js$/.test(pathname)) return true;
    // Con la barra finale per i prefissi di cartella; /login e /api/* anche senza
    return PUBLIC_PREFIXES.some(p => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')));
}
