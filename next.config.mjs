import withPWAInit from "next-pwa";
import "./lib/env.mjs";

const withPWA = withPWAInit({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
    // Resta solo la cache della pagina iniziale che next-pwa aggiunge da solo (serve solo offline); al logout tutte le cache vengono svuotate.
    // Niente cache per pagine e API: contengono dati dell'utente e resterebbero leggibili offline dopo il logout.
    // Si conservano solo le risorse statiche.
    runtimeCaching: [
        {
            urlPattern: ({ url }) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/"),
            handler: "CacheFirst",
            options: { cacheName: "static-assets", expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 } },
        },
        {
            urlPattern: ({ url }) => /\.(?:png|jpe?g|svg|webp|ico|woff2?|otf|ttf)$/i.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "images-fonts", expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 } },
        },
        { urlPattern: () => true, handler: "NetworkOnly" },
    ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'standalone', // Disabled for Vercel
    typescript: {
        ignoreBuildErrors: false,
    },
    // Pagine unificate: i vecchi indirizzi (preferiti, link salvati) portano a quelle attuali
    async redirects() {
        return [
            { source: '/calendar', destination: '/planning/calendar', permanent: false },
            { source: '/references/activities', destination: '/activities', permanent: false },
            { source: '/assets/new', destination: '/assets', permanent: false },
            { source: '/assets/qr', destination: '/assets', permanent: false },
            { source: '/predictive', destination: '/maintenance/predictive', permanent: false },
            { source: '/reports/costs', destination: '/costs', permanent: false },
            { source: '/inventory/shopping-list', destination: '/inventory?lowStock=1', permanent: false },
        ];
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    turbopack: {},
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=self', // Enable camera for QR scanning
                    }
                ],
            },
        ];
    },

};

export default withPWA(nextConfig);
