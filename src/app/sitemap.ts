import type { MetadataRoute } from "next";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import usStates from "@/data/us-states.json";
import skiResorts from "@/data/ski-resorts.json";
import liveCameraIndex from "@/data/live-camera-index.json";
import { POSTS } from "./blog/posts";
import { EVENT_WALLS } from "@/data/event-walls";

const BASE = "https://worldeye.app";

// Every country in the catalogue has a dedicated page (matches
// generateStaticParams in src/app/cameras/countries/[country]/page.tsx,
// both reading the generated camera-countries index).
const COUNTRY_SLUGS: string[] = (
  cameraCountries as { countries: Array<{ slug: string }> }
).countries.map((c) => c.slug);

// Every resort in the generated ski dataset has a page (matches
// generateStaticParams in src/app/ski-webcams/[resort]/page.tsx, both
// reading the generated ski-resorts index).
const SKI_RESORT_SLUGS: string[] = (
  skiResorts as { resorts: Array<{ slug: string }> }
).resorts.map((r) => r.slug);

const SEO_PAGES = [
  "/cameras/countries",
  "/live-traffic-cameras",
  "/us-traffic-cameras",
  "/city-webcams",
  "/world-city-webcams",
  "/europe-live-cameras",
  "/live-webcams",
];

// Wave 5 (2026-10-11): sitemap-only directory pages — not linked from site chrome.
const SEO_PAGES_WAVE5 = [
  "/city-webcams/houston",
  "/city-webcams/dallas",
  "/city-webcams/tokyo",
  "/city-webcams/sydney",
  "/beach-webcams",
  "/ski-webcams",
  "/airport-webcams",
  "/ship-tracker",
  "/weather-tracker",
  "/wildfire-tracker",
  "/hurricane-tracker",
  "/space-station-tracker",
  "/what-is-ads-b",
  "/what-is-ais",
  "/earthcam-alternative",
  "/use-cases/journalists",
  "/use-cases/emergency-preparedness",
  "/use-cases/travelers",
  "/use-cases/educators",
];

// Wave 4 (2026-10-11): sitemap-only directory pages — not linked from site chrome.
const SEO_PAGES_WAVE4 = [
  "/city-webcams/london",
  "/city-webcams/ottawa",
  "/city-webcams/toronto",
  "/city-webcams/madrid",
  "/north-america-webcams",
  "/asia-webcams",
  "/oceania-webcams",
];

// Wave 6 (2026-10-17): sitemap-only directory pages — not linked from site chrome.
const SEO_PAGES_WAVE6 = [
  "/cyber-threat-map",
  "/south-america-webcams",
  "/city-webcams/auckland",
  "/city-webcams/fort-worth",
];

// Wave 7 (2026-10-18): long-tail country traffic-camera hubs + live plane
// spotting — targets in ~/workspace/worldeye-longtail-seo/PLAN.md. Cross-linked
// from each other and from /europe-live-cameras + /asia-webcams peers.
const SEO_PAGES_WAVE7 = [
  "/japan-traffic-cameras",
  "/canada-traffic-cameras",
  "/spain-traffic-cameras",
  "/south-korea-traffic-cameras",
  "/germany-traffic-cameras",
  "/norway-traffic-cameras",
  "/sweden-traffic-cameras",
  "/live-plane-spotting",
];

// Wave 8 (2026-10-20): data-generated city webcam pages — the generated
// tier of /city-webcams/[city], derived from src/data/city-pages.json
// (tools/build-city-pages.mjs) so this list can never drift from the
// pages that exist. The ten editorial cities are in Waves 4–6 above.
// Cross-linked from /world-city-webcams and from each other.
const SEO_PAGES_WAVE8 = cityPages.cities.map((c) => `/city-webcams/${c.slug}`);

// US state traffic pages: derived from the generated state index
// (src/data/us-states.json — tools/build-us-states.mjs) so this list
// can never drift from the pages that exist. The original seven state
// URLs shipped in Waves 4–6 and are covered by this list now.
const SEO_PAGES_STATES = (
  usStates as { states: Array<{ slug: string }> }
).states.map((s) => `/us-traffic-cameras/${s.slug}`);

// Wave 9 (2026-10-20): trends-driven niche directories — aurora, volcano and
// dark-sky cameras (see ~/workspace/worldeye-growth/TRENDS-MAP.md).
const SEO_PAGES_WAVE9 = [
  "/northern-lights-webcams",
  "/volcano-webcams",
  "/dark-sky-cameras",
  "/sunrise-around-the-world",
];

// Wave 10 (2026-10-22): the ALERTCalifornia fire-camera network as its own
// page — cross-linked from /wildfire-tracker (a different data source:
// satellite detections there, cameras here) — plus the voice-answers hub
// (spoken-form questions with standalone answers, built from
// src/lib/voice-questions.ts for voice assistants and AI answer engines).
const SEO_PAGES_WAVE10 = [
  "/california-fire-cameras",
  "/answers",
];

// Wave 11 (2026-10-22): the Live Camera Index — primary-data research page
// (served/indexed camera counts by country, city, state network and
// publisher, with a downloadable dataset). Data: src/data/live-camera-index.json
// (tools/build-live-camera-index.mjs). Linked from /blog/live-cameras-by-country.
const SEO_PAGES_WAVE11 = ["/live-camera-index"];

// Wave 12 (2026-10-26): Random Camera Roulette — the geography guessing
// game at /random (a random live camera, guess the country, scored
// reveal), built for geography-game audiences.
const SEO_PAGES_WAVE12 = ["/random"];

// Trending event pages (2026-10-26): dated event hubs on the topic-hub
// pattern — the World Series, California king-tide flooding, first
// snow, ski opening week, the NYC Marathon and the 100th Macy's
// Parade, the Thanksgiving travel rush, and the Starship Flight 15
// launch hub (which stays up as the standing launch page).
const SEO_PAGES_EVENTS_2026 = [
  "/world-series-2026",
  "/california-flood-cams",
  "/first-snow-2026",
  "/ski-opening-week-2026",
  "/nyc-marathon-2026",
  "/macys-thanksgiving-parade-2026",
  "/thanksgiving-travel-2026",
  "/starship-flight-15",
];

// WorldEye Ambient (2026-10-26): the product landing, the Slow TV
// guide and the Stream to YouTube page. The /ambient player itself
// is an app surface (noindex) and stays out of the sitemap.
const SEO_PAGES_AMBIENT = [
  "/ambient-mode",
  "/ambient-tv",
  "/stream-to-youtube",
];

// Live event walls (2026-10-24): the /live-events hub plus one page per
// wall in src/data/event-walls.ts — derived from the same config the
// pages' generateStaticParams reads, so the two can never drift.
const SEO_PAGES_EVENT_WALLS = [
  "/live-events",
  ...EVENT_WALLS.map((w) => `/live-events/${w.slug}`),
];

// Competitor comparisons (2026-10-11): linked from footer "Alternatives & Comparisons".
const SEO_PAGES_COMPARE = [
  "/alternatives/gods-eye-view",
  "/alternatives/osiris",
  "/alternatives/godsview-ai",
  "/alternatives/war-monitor",
  "/alternatives/liveuamap",
  "/alternatives/world-monitor",
  "/alternatives/flightradar24",
  "/alternatives/dataminr",
  "/alternatives/google-earth",
  "/alternatives/windy",
  "/alternatives/skylinewebcams",
  "/alternatives/zoom-earth",
  "/best-osint-tools",
  "/best-geopolitical-monitoring-tools",
  "/best-flight-tracking-tools",
  "/best-global-intelligence-dashboards",
  "/best-interactive-3d-globes",
  "/best-conflict-monitoring-tools",
  "/best-live-webcam-sites",
  "/best-ship-tracking-tools",
  "/best-satellite-tracking-tools",
  "/free-osint-tools",
  "/compare",
  "/compare/acled",
  "/compare/adsb-exchange",
  "/compare/airplanes-live",
  "/compare/bellingcat-toolkit",
  "/compare/conflictzone-io",
  "/compare/copernicus-browser",
  "/compare/crisis24",
  "/compare/dataminr",
  "/compare/deepstatemap",
  "/compare/flightradar24",
  "/compare/flightaware",
  "/compare/gdelt",
  "/compare/global-threat-watch",
  "/compare/google-earth",
  "/compare/intelligence-x",
  "/compare/liveuamap",
  "/compare/maltego",
  "/compare/marinetraffic",
  "/compare/nasa-worldview",
  "/compare/osint-industries",
  "/compare/recorded-future",
  "/compare/sentinel-hub",
  "/compare/shadowdragon",
  "/compare/vesselfinder",
  "/compare/world-monitor",
  "/compare/zoom-earth",
  "/compare/windy",
  "/compare/earthcam",
  "/compare/skylinewebcams",
  "/compare/ventusky",
  "/compare/explore-org",
  "/compare/n2yo",
  "/compare/worldeye-vs-osiris",
];

export default function sitemap(): MetadataRoute.Sitemap {
  // Honest lastmod (SEO #11, 2026-10-26): every URL used to be stamped
  // "now" on every render, which teaches crawlers to distrust the signal.
  // Each set is now stamped with the real date of the data or content
  // behind it — the generating dataset's `generatedAt`, or a post's own
  // date/revision — and sets with no honest date source in the repo omit
  // lastModified entirely. The URL set, order, changeFrequency and
  // priority are unchanged.
  const catalogueDate = new Date(
    (cameraCountries as { generatedAt: string }).generatedAt,
  );
  const cityPagesDate = new Date(
    (cityPages as unknown as { generatedAt: string }).generatedAt,
  );
  const statesDate = new Date((usStates as { generatedAt: string }).generatedAt);
  const skiDate = new Date((skiResorts as { generatedAt: string }).generatedAt);
  const cameraIndexDate = new Date(
    (liveCameraIndex as { generatedAt: string }).generatedAt,
  );
  const latestPostDate = new Date(
    POSTS.reduce(
      (max, p) => {
        const d = p.updated ?? p.date;
        return d > max ? d : max;
      },
      POSTS[0].updated ?? POSTS[0].date,
    ),
  );
  return [
    { url: `${BASE}/`, lastModified: catalogueDate, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/features`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/gods-eye-view`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/cameras`, lastModified: catalogueDate, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/live-flight-tracker`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/satellite-tracker`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/earthquake-tracker`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/tornado-tracker`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: latestPostDate, changeFrequency: "weekly", priority: 0.7 },
    ...POSTS.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.updated ?? p.date),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/affiliates`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/affiliates/leaderboard`, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/affiliates/terms`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/changelog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/security`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    // Camera directory (sitemap-only SEO pages — not linked from site chrome).
    { url: `${BASE}/cameras/countries`, lastModified: catalogueDate, changeFrequency: "monthly", priority: 0.7 },
    ...SEO_PAGES.filter((p) => p !== "/cameras/countries").map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE4.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE5.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE6.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE7.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE8.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: cityPagesDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE9.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_STATES.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: statesDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE10.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_WAVE11.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: cameraIndexDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_EVENTS_2026.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_WAVE12.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_AMBIENT.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_EVENT_WALLS.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_COMPARE.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...COUNTRY_SLUGS.map((slug) => ({
      url: `${BASE}/cameras/countries/${slug}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SKI_RESORT_SLUGS.map((slug) => ({
      url: `${BASE}/ski-webcams/${slug}`,
      lastModified: skiDate,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
