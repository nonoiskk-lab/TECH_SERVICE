import type { MetadataRoute } from "next";
import { isLegalGateOpen, siteUrl } from "@/config/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const open = isLegalGateOpen();
  const paths = ["/", "/create", "/celebrate", "/visit", "/book", "/policies", "/contact", "/podcast-studio-in-dhanbad"];
  // Theatre pages enter the sitemap only once the Legal Gate is open.
  if (open) paths.push("/watch", "/private-theatre-in-dhanbad");
  return paths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.7 }));
}
