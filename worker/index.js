// Worker personalizzato: next-pwa lo unisce al service worker generato (public/sw.js).
// Gestisce le notifiche push. Il payload contiene SOLO titolo, testo e indirizzo da aprire: nessun altro dato.

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        // Payload non in formato JSON: si mostra comunque una notifica generica
        data = {};
    }

    const title = typeof data.title === 'string' && data.title ? data.title : 'CMMS';
    const body = typeof data.body === 'string' ? data.body : '';
    // Solo percorsi interni dell'app; qualsiasi altra cosa ricade sulla home
    const rawUrl = typeof data.url === 'string' ? data.url : '/';
    const url = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : '/';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            data: { url },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const rawUrl = event.notification.data && typeof event.notification.data.url === 'string' ? event.notification.data.url : '/';
    const target = new URL(rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : '/', self.location.origin).href;

    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of windows) {
                // Una finestra dell'app gia' aperta: la si porta in primo piano e si va all'indirizzo
                if (client.url.startsWith(self.location.origin)) {
                    try {
                        const navigated = 'navigate' in client ? await client.navigate(target) : null;
                        const win = navigated || client;
                        if ('focus' in win) return await win.focus();
                        return undefined;
                    } catch {
                        // navigate puo' fallire se la finestra non e' controllata: si apre una nuova finestra sotto
                        break;
                    }
                }
            }
            return self.clients.openWindow(target);
        })(),
    );
});
