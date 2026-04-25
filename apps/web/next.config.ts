import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  transpilePackages: ['@zktalk/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/api/upload/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
        pathname: '/api/upload/**',
      },
    ],
    // Same-origin proxy that rewrites `/api/upload/...` URLs from the API
    // onto a Next route (so cookies + range requests work). Without this
    // entry the Next image optimizer 400s every avatar/community icon.
    localPatterns: [
      {
        pathname: '/api/public-assets/**',
      },
    ],
  },
};

export default nextConfig;
