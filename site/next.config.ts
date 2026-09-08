import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Two dev servers sharing one build directory corrupt each other's webpack
  // cache, so a second instance (e.g. an e2e preview) can point elsewhere.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
