import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Conversation attachments are capped at 20 MB (domain/intelligence/attachments.ts);
  // leave room for multipart overhead.
  experimental: {
    serverActions: { bodySizeLimit: '21mb' },
    proxyClientMaxBodySize: '21mb',
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
