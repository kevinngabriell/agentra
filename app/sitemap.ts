import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

// Only public, indexable pages. /login and /forgot-password are noindex and /agentra/* is
// private, so they are intentionally left out. `lastModified` is omitted because a build-time
// `new Date()` would claim every page changed on every deploy, which search engines learn to ignore.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<{ path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/register", changeFrequency: "monthly", priority: 0.8 },
    { path: "/help", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ];

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
