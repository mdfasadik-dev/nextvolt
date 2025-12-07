import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TEMP: Allow production build to pass while TypeScript/ESLint issues are being fixed.
  // Remove this and address lint errors before final deployment.
  images: {
    unoptimized: true,
    // Allow Supabase storage & other https domains (adjust to be stricter if you know exact project ref)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      }
    ],
  },
};

export default nextConfig;
