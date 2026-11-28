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
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          {
            // Razorpay Checkout and the Google Maps embed are the only third-party origins in use.
            // Scripts/styles keep 'unsafe-inline' because Next.js injects inline bootstrap code; the
            // other directives still stop framing, plugin content, base-tag and form hijacking.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
              "frame-src https://api.razorpay.com https://checkout.razorpay.com https://maps.google.com https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
