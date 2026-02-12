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

  // Skip build-time error page generation to avoid <Html> import issues
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Ignore build errors for error pages
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
