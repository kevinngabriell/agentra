import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The authenticated app and API are private. /login and /forgot-password stay crawlable
      // on purpose so crawlers can read their `noindex` meta tag.
      disallow: ["/agentra/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
