import type { MetadataRoute } from "next";
import { isLegalGateOpen, siteUrl } from "@/config/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const open = isLegalGateOpen();
  const paths = ["/", "/podcast-studio", "/celebrations", "/visit", "/book", "/policies", "/policies/safety", "/policies/podcast", "/policies/creator", "/contact", "/podcast-studio-in-dhanbad", "/creator-plans", "/gallery", "/about", "/faqs", "/privacy", "/terms", "/cancellation-refund", "/my-booking"];
  // Theatre pages enter the sitemap only once the Legal Gate is open.
  if (open) paths.push("/private-theatre", "/private-theatre-in-dhanbad", "/policies/theatre");
  return paths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.7 }));
}
