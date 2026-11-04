import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lokální buildy používají izolovaný .next-build (kvůli běžícímu dev serveru),
  // ale Vercel vždy očekává standardní .next.
  distDir:
    !process.env.VERCEL && process.env.NEXT_BUILD_DIST_DIR
      ? process.env.NEXT_BUILD_DIST_DIR
      : ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Dashboard se nesmí vkládat do cizího rámce (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
