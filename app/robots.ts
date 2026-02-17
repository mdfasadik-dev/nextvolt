import type { MetadataRoute } from "next";
import { SEO_CONFIG, absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/auth", "/checkout", "/confirmation", "/api"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SEO_CONFIG.siteUrl,
  };
}
