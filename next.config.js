/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Railway deployment
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Skip trailing slash
  trailingSlash: false,

  // Custom build ID for cache busting
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Disable static error pages generation completely
  // This prevents the /_error route from being created
  async redirects() {
    return []
  },

  async rewrites() {
    return []
  },

  // Skip static page generation for error pages
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
}

module.exports = nextConfig
