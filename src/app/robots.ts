import type { MetadataRoute } from "next";

const BASE = "https://worldeye.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/premium"],
      },
    ],
    // Main sitemap + the Google News sitemap (posts from the last 48 hours).
    sitemap: [`${BASE}/sitemap.xml`, `${BASE}/news-sitemap.xml`],
  };
}
