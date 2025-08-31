/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['storage.googleapis.com', 'cdn.example.com', 'picsum.photos', 'images.unsplash.com', 'plus.unsplash.com', 'localhost'],
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    optimizeCss: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig