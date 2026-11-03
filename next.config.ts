import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const isDev = process.env.NODE_ENV === 'development';
const saasDevApiOrigin = process.env.SAAS_DEV_API_ORIGIN ?? 'http://127.0.0.1:18106';
const saasDevApiPrefix = process.env.SAAS_DEV_API_PREFIX ?? `${basePath}/api`;

const nextConfig: NextConfig = {
  basePath,
  output: 'standalone',
  compress: !isDev,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  ...(isDev && {
    rewrites: async () => [
      {
        source: '/api/:path*',
        destination: `${saasDevApiOrigin}${saasDevApiPrefix}/:path*`,
      },
    ],
  }),
};

export default nextConfig;
