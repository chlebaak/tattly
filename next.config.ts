import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lokální buildy používají izolovaný .next-build (kvůli běžícímu dev serveru),
  // ale Vercel vždy očekává standardní .next.
  distDir:
    !process.env.VERCEL && process.env.NEXT_BUILD_DIST_DIR
      ? process.env.NEXT_BUILD_DIST_DIR
      : ".next",
};

export default nextConfig;
