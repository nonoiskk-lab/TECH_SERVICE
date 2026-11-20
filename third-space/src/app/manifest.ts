import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "THIRD SPACE — Private Theatre & Creator Studio",
    short_name: "THIRD SPACE",
    description: "Your Voice. Your Space. Your Story. Dhanbad's Private Experience & Creator Destination.",
    start_url: "/",
    display: "standalone",
    background_color: "#11100F",
    theme_color: "#11100F",
    icons: [
      { src: "/brand/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
