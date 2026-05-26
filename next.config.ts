import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jlelkunjjbyitnknzhpp.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // PCGS coin images (www + any CDN subdomain)
        protocol: 'https',
        hostname: '**.pcgs.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        // Coin catalog reference images
        protocol: 'https',
        hostname: 'i.usacoinbook.com',
      },
      {
        // Wikipedia coin images (used in listings)
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
