import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/book/confirmation/", "/admin"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
