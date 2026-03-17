/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Turbo settings for faster development
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

module.exports = nextConfig;
