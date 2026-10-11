import type { MetadataRoute } from "next";
import directory from "@/data/camera-directory.json";

const BASE = "https://worldeye.app";

// Top 30 countries get dedicated pages (matches generateStaticParams in
// src/app/cameras/countries/[country]/page.tsx).
const COUNTRY_SLUGS: string[] = directory.countries.slice(0, 30).map((c) => c.slug);

const SEO_PAGES = [
  "/cameras/countries",
  "/live-traffic-cameras",
  "/world-city-webcams",
  "/europe-live-cameras",
  "/live-webcams",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/features`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/cameras`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/live-flight-tracker`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/satellite-tracker`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/earthquake-tracker`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/blog/what-is-osint`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/blog/live-flight-tracking-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/blog/world-live-cameras`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/affiliates`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/affiliates/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/affiliates/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/docs`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/security`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    // Camera directory (sitemap-only SEO pages — not linked from site chrome).
    { url: `${BASE}/cameras/countries`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...SEO_PAGES.filter((p) => p !== "/cameras/countries").map((p) => ({
      url: `${BASE}${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...COUNTRY_SLUGS.map((slug) => ({
      url: `${BASE}/cameras/countries/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
