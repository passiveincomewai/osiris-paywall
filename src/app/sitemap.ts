import type { MetadataRoute } from "next";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import usStates from "@/data/us-states.json";
import skiResorts from "@/data/ski-resorts.json";
import liveCameraIndex from "@/data/live-camera-index.json";
import cameraNetworkReport from "@/data/camera-network-2026-10.json";
import { POSTS } from "./blog/posts";
import { EVENT_WALLS } from "@/data/event-walls";
import { AIRPORT_PAGES } from "@/lib/airport-pages";
import { NATIONAL_PARKS } from "@/lib/national-parks";
/* Border-crossings delta: registry for SEO_PAGES_BORDER (below). */
import { BORDER_CROSSINGS } from "@/lib/border/crossings";
import { POPULAR_PAIRS, pairSlug } from "@/lib/ski-compare";
import { BEACH_SPOT_SLUGS, SURF_SPOT_SLUGS } from "@/lib/surf-spots";

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
// Monthly Camera Network Reports (2026-10-27): dated, citable catalogue
// statistics editions (three-measures framing, downloadable dataset).
const SEO_PAGES_REPORTS = ["/reports/camera-network-2026-10"];

// Methodology (2026-10-27): how the catalogue and its published counts
// are produced. /methodology documents the same instruments the Live
// Camera Index (Wave 11) measures; it carries the page's own revision
// date (its REVISED stamp, 2026-10-27) as lastmod.
const SEO_PAGES_METHODOLOGY = ["/methodology"];
const METHODOLOGY_DATE = new Date("2026-10-27");

// Wave 12 (2026-10-26): Random Camera Roulette — the geography guessing
// game at /random (a random live camera, guess the country, scored
// reveal), built for geography-game audiences.
const SEO_PAGES_WAVE12 = ["/random"];

// Wave 13 (2026-10-26): SEO page set #37 — the aurora hub (Finland /
// Iceland / Norway walls + the live Kp index), the Japan hub, the port
// hub, and the New York City flagship under /city-webcams. All four
// are catalogue-driven walls, so they carry the catalogue's date.
const SEO_PAGES_WAVE13 = [
  "/aurora-webcams",
  "/japan-webcams",
  "/port-webcams",
  "/city-webcams/new-york-city",
];

// Wave 14 (2026-10-27): per-airport pages — one page per airport in
// lib/airport-pages (51 airports, radius walls over the catalogue),
// derived from the same data module the route's generateStaticParams
// reads, so the two can never drift. Catalogue-driven, so they carry
// the catalogue's date like Wave 13.
const SEO_PAGES_WAVE14 = AIRPORT_PAGES.map((a) => `/airport-webcams/${a.slug}`);

// Tools (2026-10-26): Photo Geolocation (Beta) — the free public tool
// page at /tools/photo-geolocation.
const SEO_PAGES_TOOLS = ["/tools/photo-geolocation", "/tools/camera-distance"];

// Photo Geolocation guides (2026-10-27): three intent-split landing
// pages supporting the tool — the head question ("where was this
// photo taken"), the tool-name search ("photo location finder") for
// travellers and creators, and the verification intent ("verify photo
// location") for journalists and fact-checkers. Each links into the
// tool page above; the tool itself stays in SEO_PAGES_TOOLS.
const SEO_PAGES_GEO_GUIDES = [
  "/where-was-this-photo-taken",
  "/photo-location-finder",
  "/verify-photo-location",
];

// Free camera embeds (2026-10-27): the picker page for the public
// embed widget. The player routes (/embed/camera/*) are noindex and
// deliberately stay out of the sitemap.
const SEO_PAGES_EMBED = ["/embed-camera"];

// Research & education access (2026-10-27): the documented routes to
// public-camera metadata — the Enterprise feed/API under the rights
// registry, the terms framework, and how researchers request access.
const SEO_PAGES_RESEARCH = ["/research-access"];

// Partners (2026-10-27): the partner & data-source directory — an
// invitation-only partners tier plus every catalogue source label with
// its camera count (dated snapshot in src/app/partners/sources-data.ts).
const SEO_PAGES_PARTNERS = ["/partners"];

// National park hubs (2026-10-27): the /national-park-webcams hub and
// one page per park in the src/lib/national-parks registry —
// catalogue-driven walls, so they carry the catalogue's date like
// Wave 13.
const SEO_PAGES_PARKS = [
  "/national-park-webcams",
  ...NATIONAL_PARKS.map((p) => `/national-park-webcams/${p.slug}`),
];

// Wave 15 (2026-10-27): interstate corridor camera pages — cameras in
// driving order along the eight interstates with real catalogue density
// (I-95, I-15, I-5, I-90, I-35, I-80, I-70, I-40), plus their index hub.
// Catalogue-driven like Wave 13, so they carry the catalogue's date.
const SEO_PAGES_WAVE15 = [
  "/interstate-cameras",
  "/interstate-cameras/i-95",
  "/interstate-cameras/i-15",
  "/interstate-cameras/i-5",
  "/interstate-cameras/i-90",
  "/interstate-cameras/i-35",
  "/interstate-cameras/i-80",
  "/interstate-cameras/i-70",
  "/interstate-cameras/i-40",
];

/* ── BEGIN border-crossings delta (separable) ──────────────────────
   Border crossings (2026-10-27): the /border-crossings hub + one
   page per crossing in the registry (lib/border/crossings) — CBP
   wait times + a camera wall each. Derived from the registry so the
   sitemap can never list a crossing the router doesn't serve. These
   pages revalidate every 5 minutes (live wait data), hence "daily"
   change frequency and no catalogue lastmod. */
const SEO_PAGES_BORDER = [
  "/border-crossings",
  ...BORDER_CROSSINGS.map((c) => `/border-crossings/${c.slug}`),
];
/* ── END border-crossings delta ──────────────────────────────────── */

// Wave 16 (2026-10-27): the surf & beach spot walls (keyword wave B) —
// the /surf-webcams hub plus one page per spot in lib/surf-spots:
// /surf-webcams/<slug> for the 13 surf towns and /beach-webcams/<slug>
// for the 9 beach towns. The slug lists derive from the same module
// the routes' generateStaticParams read, so the sitemap cannot drift
// from the pages that exist. Catalogue-driven walls, so they carry
// the catalogue's date.
const SEO_PAGES_WAVE16 = [
  "/surf-webcams",
  ...SURF_SPOT_SLUGS.map((slug) => `/surf-webcams/${slug}`),
  ...BEACH_SPOT_SLUGS.map((slug) => `/beach-webcams/${slug}`),
];

// Seasonal annuals (2026-10-27): evergreen pages for the five events
// that recur every year — dates come from lib/seasonal-events tables,
// never from prose, so the pages stay correct year to year.
const SEO_PAGES_SEASONAL = [
  "/new-years-eve-times-square",
  "/mardi-gras-new-orleans",
  "/cherry-blossoms-washington-dc",
  "/oktoberfest-munich",
  "/fall-foliage-cameras",
];

// Trending event pages (2026-10-26): dated event hubs on the topic-hub
// pattern — the World Series, California king-tide flooding, first
// snow, ski opening week, the NYC Marathon and the 100th Macy's
// Parade, the Thanksgiving travel rush, and the Starship Flight 15
// launch hub (which stays up as the standing launch page). Batch C
// adds the season-long atmospheric river watch, the Four Corners
// flood watch, the Christmas markets hub and the Leonids night-sky
// page. (/volcano-webcams is strengthened in the same batch; it is
// already listed in Wave 9. /manatee-season-2026 was audit-gated and
// NOT built — the catalogue holds no dedicated manatee cameras — so
// it is deliberately absent here.)
const SEO_PAGES_EVENTS_2026 = [
  "/world-series-2026",
  "/california-flood-cams",
  "/first-snow-2026",
  "/ski-opening-week-2026",
  "/nyc-marathon-2026",
  "/macys-thanksgiving-parade-2026",
  "/thanksgiving-travel-2026",
  "/starship-flight-15",
  "/atmospheric-river-watch",
  "/four-corners-flooding",
  "/christmas-markets-live",
  "/leonids-meteor-shower-2026",
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
  const networkReportDate = new Date(
    (cameraNetworkReport as { generatedAt: string }).generatedAt,
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
    ...SEO_PAGES_REPORTS.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: networkReportDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_METHODOLOGY.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: METHODOLOGY_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.6,
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
    ...SEO_PAGES_WAVE13.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE14.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_TOOLS.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_GEO_GUIDES.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_EMBED.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_RESEARCH.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_PARTNERS.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_PARKS.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE15.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    /* ── BEGIN border-crossings delta (separable) ── */
    ...SEO_PAGES_BORDER.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    /* ── END border-crossings delta ── */
    ...SEO_PAGES_WAVE16.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_SEASONAL.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
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
    // Ski compare tool + the curated head-to-head pages (lib/ski-compare).
    {
      url: `${BASE}/ski-webcams/compare`,
      lastModified: skiDate,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    ...POPULAR_PAIRS.map(([a, b]) => ({
      url: `${BASE}/ski-webcams/compare/${pairSlug(a, b)}`,
      lastModified: skiDate,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
