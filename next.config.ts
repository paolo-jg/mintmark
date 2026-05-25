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
        // PCGS coin images
        protocol: 'https',
        hostname: 'www.pcgs.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
