/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'standalone', // Disabled for Vercel
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    // Rimosso configurazione eslint deprecata / Removed deprecated eslint config
};

export default nextConfig;
