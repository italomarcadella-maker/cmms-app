import withPWAInit from "next-pwa";
import "./lib/env.mjs";

const withPWA = withPWAInit({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'standalone', // Disabled for Vercel
    typescript: {
        ignoreBuildErrors: false,
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
