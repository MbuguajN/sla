/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    optimizeFonts: false,
    experimental: {
        // serverActions: true, // Next.js 14 enables this by default if using App Router
    },
};

export default nextConfig;
