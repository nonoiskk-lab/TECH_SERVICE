import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // This app lives inside the TECH_SERVICE repo; pin the root so Next does not
  // pick up the parent app's lockfile and middleware.
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
