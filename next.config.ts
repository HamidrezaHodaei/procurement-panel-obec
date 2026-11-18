import type { NextConfig } from 'next';

/** Flask backend (MySQL). All /api/procurement/* and /api/auth/* calls are proxied to it, so the
 *  browser stays same-origin and the login cookie works without any CORS setup. */
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/procurement/:path*', destination: `${BACKEND_URL}/api/procurement/:path*` },
        { source: '/api/auth/:path*', destination: `${BACKEND_URL}/api/auth/:path*` }
      ],
      afterFiles: [],
      fallback: []
    };
  }
};

export default nextConfig;
