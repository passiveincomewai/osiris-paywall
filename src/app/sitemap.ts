import type { MetadataRoute } from "next";

const BASE = "https://osiris-lime.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/affiliates`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/affiliates/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/affiliates/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/docs`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
