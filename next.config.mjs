/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        // serverActions: true, // Next.js 14 enables this by default if using App Router
        optimizePackageImports: ['lucide-react', 'date-fns'],
    },
};

export default nextConfig;
