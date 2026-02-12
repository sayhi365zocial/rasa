/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization to prevent prerendering errors
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

  // Disable generateBuildId to use default
  // This helps with Railway deployments
}

module.exports = nextConfig
