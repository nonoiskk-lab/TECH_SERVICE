import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // This app lives inside the TECH_SERVICE repo; pin the root so Next does not
  // pick up the parent app's lockfile and middleware.
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return [
      { source: "/watch", destination: "/private-theatre", permanent: true },
      { source: "/create", destination: "/podcast-studio", permanent: true },
      { source: "/celebrate", destination: "/celebrations", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
