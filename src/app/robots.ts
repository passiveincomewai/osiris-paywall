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
    sitemap: `${BASE}/sitemap.xml`,
  };
}
