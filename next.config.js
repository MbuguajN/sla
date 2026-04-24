/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // speed up compilation by optimizing hugeicons tree-shaking
  transpilePackages: ['hugeicons-react'],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};


module.exports = nextConfig;
