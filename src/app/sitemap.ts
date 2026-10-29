import type { MetadataRoute } from "next";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import usStates from "@/data/us-states.json";
import skiResorts from "@/data/ski-resorts.json";
import liveCameraIndex from "@/data/live-camera-index.json";
import cameraNetworkReport from "@/data/camera-network-2026-10.json";
import { POSTS } from "./(en)/blog/posts";
import { EVENT_WALLS } from "@/data/event-walls";
import { AIRPORT_PAGES } from "@/lib/airport-pages";
import { NATIONAL_PARKS } from "@/lib/national-parks";
import { VOLCANOES } from "@/lib/volcanoes";
import { AURORA_PLACES } from "@/lib/aurora-places";
import { ICONIC_PLACES } from "@/lib/iconic-places";
import { LAUNCH_SITES } from "@/lib/launch-sites";
import { ISS_CITIES } from "@/lib/iss-passes";
import { ANIMAL_STARS } from "@/lib/animal-cams";
import { UNIVERSITIES } from "@/lib/universities";
import { FERRY_SYSTEMS } from "@/lib/ferries";
import { CRUISE_PORTS } from "@/lib/cruise-ports";
import { RADAR_METROS } from "@/lib/radar-metros";
import { REGISTRY_VERIFIED_AT, SHIPS } from "@/lib/ships/registry";
import { getWildfireIncidents } from "@/lib/fire-perimeters";
/* Border-crossings delta: registry for SEO_PAGES_BORDER (below). */
import { BORDER_CROSSINGS } from "@/lib/border/crossings";
import { POPULAR_PAIRS, pairSlug } from "@/lib/ski-compare";
import { BEACH_SPOT_SLUGS, SURF_SPOT_SLUGS } from "@/lib/surf-spots";
import { MANIFEST_ENTRIES } from "@/i18n/manifest";
import { hreflangMapFor, localizedUrl } from "@/lib/i18n-seo";
import { withoutFutureLastmod } from "@/lib/lastmod";
import { RAIL_PLACE_SLUGS } from "@/lib/railfan-places";
import { agencySeoData, seoAgencies } from "@/lib/transit/seo-data";
import { feedVersionDate, transitPathsForAgency } from "@/lib/transit/seo";
import { isConsolidatedCountry, isFoldedResort } from "@/lib/indexation-gates";

const BASE = "https://worldeye.app";

// Every country above the C10 substance line has a dedicated page
// (matches generateStaticParams in
// src/app/cameras/countries/[country]/page.tsx). Below-line countries
// are consolidated into their regional hubs (src/lib/indexation-gates.ts)
// — their URLs 301 to the hub and leave the sitemap.
const COUNTRY_SLUGS: string[] = (
  cameraCountries as { countries: Array<{ slug: string }> }
).countries
  .map((c) => c.slug)
  .filter((slug) => !isConsolidatedCountry(slug));

// Every resort passing the C10 ski gate has a page (matches
// generateStaticParams in src/app/ski-webcams/[resort]/page.tsx).
// Folded resorts are listed on the /ski-webcams hub without pages.
const SKI_RESORT_SLUGS: string[] = (
  skiResorts as { resorts: Array<{ slug: string }> }
).resorts
  .map((r) => r.slug)
  .filter((slug) => !isFoldedResort(slug));

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
// page at /tools/photo-geolocation. WiFi Sensing (/sensing) joined
// 2026-10-29 — also a free public tool, listed in the OSINT tools menu.
const SEO_PAGES_TOOLS = ["/tools/photo-geolocation", "/tools/camera-distance", "/sensing"];

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

// Tutorials (2026-10-27): the step-by-step guide family — hub plus
// flight tracking, route traffic, recording and pro search.
const SEO_PAGES_TUTORIALS = [
  "/tutorials",
  "/tutorials/track-a-live-flight",
  "/tutorials/check-traffic-on-your-route",
  "/tutorials/record-a-live-camera",
  "/tutorials/search-cameras-like-a-pro",
];

// Free camera embeds (2026-10-27): the picker page for the public
// embed widget. The player routes (/embed/camera/*) are noindex and
// deliberately stay out of the sitemap.
const SEO_PAGES_EMBED = ["/embed-camera"];

// Research & education access (2026-10-27): the documented routes to
// public-camera metadata — the Enterprise feed/API under the rights
// registry, the terms framework, and how researchers request access.
const SEO_PAGES_RESEARCH = ["/research-access", "/research/live-camera-platforms-compared"];

// Partners (2026-10-27): the partner & data-source directory — an
// invitation-only partners tier plus every catalogue source label with
// its camera count (dated snapshot in src/app/partners/sources-data.ts).
const SEO_PAGES_PARTNERS = ["/partners"];

// Enterprise (2026-10-27, Top-50 #1): the $999/yr camera-feed product
// page was an orphan — live and indexable but absent from the sitemap.
// It is a standing product page, so it joins the sitemap with a
// commercial priority rather than the 0.6 directory default.
const SEO_PAGES_ENTERPRISE = ["/enterprise"];
// Index recovery (2026-10-27): two real pages that were orphans —
// live routes with no sitemap entry and no crawlable inbound links.
const SEO_PAGES_ORPHANS = ["/use-cases", "/submit-camera"];

// National park hubs (2026-10-27): the /national-park-webcams hub and
// one page per park in the src/lib/national-parks registry —
// catalogue-driven walls, so they carry the catalogue's date like
// Wave 13.
const SEO_PAGES_PARKS = [
  "/national-park-webcams",
  ...NATIONAL_PARKS.map((p) => `/national-park-webcams/${p.slug}`),
];

// Menu #2 Wave A (2026-10-27): per-volcano pages under the existing
// /volcano-webcams hub (listed in Wave 9) and per-place aurora pages
// under the existing /northern-lights-webcams hub. Both registries
// are catalogue-driven walls, so they carry the catalogue's date
// like the parks. Only volcanoes/places with real catalogue cameras
// have rows — the registries' tests pin the rejected candidates
// (Stromboli, Popocatépetl, Yellowknife, Kiruna…) at zero.
const SEO_PAGES_VOLCANOES = VOLCANOES.map((v) => `/volcano-webcams/${v.slug}`);
const SEO_PAGES_AURORA_PLACES = AURORA_PLACES.map(
  (p) => `/northern-lights-webcams/${p.slug}`,
);

// Menu #2 Wave A part 2 (2026-10-28): the iconic-places and
// launch-sites families — catalogue-driven like the volcanoes, so
// they carry the catalogue's date. Only places and sites with real
// qualifying cameras have rows; the registries' tests pin the
// rejected candidates (Times Square, Abbey Road, Bourbon Street,
// Starbase, Vandenberg, Wallops…) at zero.
const SEO_PAGES_ICONIC_PLACES = [
  "/iconic-places",
  ...ICONIC_PLACES.map((p) => `/iconic-places/${p.slug}`),
];
const SEO_PAGES_LAUNCH_SITES = [
  "/launch-sites",
  ...LAUNCH_SITES.map((s) => `/launch-sites/${s.slug}`),
];

// Menu #2 Wave B part 1 (2026-10-27): the animal-webcams hub + its 12
// star pages (lib/animal-cams — every star is an audited catalogue
// feed whose own record names the animal) and the university-webcams
// hub + 25 per-university pages (lib/universities — every institution
// admitted because a camera's own record names it, campus as subject).
// Both registries are catalogue-driven, so they carry the catalogue's
// date like Wave A. The registries' tests pin the rejected candidates
// (Brooks Falls, eagle nests, field stations, road junctions) at zero.
const SEO_PAGES_ANIMALS = [
  "/animal-webcams",
  ...ANIMAL_STARS.map((s) => `/animal-webcams/${s.slug}`),
];
const SEO_PAGES_UNIVERSITIES = [
  "/university-webcams",
  ...UNIVERSITIES.map((u) => `/university-webcams/${u.slug}`),
];

// Menu #2 Wave B (2026-10-27): ferry tracker (hub + the three
// evidenced systems) and cruise-port live boards (the nine evidenced
// ports under /port-webcams/[port]). Registry-driven like the
// volcanoes; the registries' tests pin the rejected candidates
// (Port Canaveral, Southampton, Cozumel…) at zero cameras.
const SEO_PAGES_FERRIES = [
  "/ferry-tracker",
  ...FERRY_SYSTEMS.map((s) => `/ferry-tracker/${s.slug}`),
];
const SEO_PAGES_CRUISE_PORTS = CRUISE_PORTS.map((p) => `/port-webcams/${p.slug}`);

// Menu #2 Wave C part 2 (2026-10-28): the weather-radar family —
// the /weather-radar hub + one page per metro in lib/radar-metros.
// The walls are catalogue-driven like the volcanoes, so they carry
// the catalogue's date. Only metros clearing the family's measured
// line (250 cameras within 30 km of the cluster centre) have rows;
// the registry's tests pin the rejected candidates (Chicago 220,
// Austin 223, San Diego 219…) under it. The /wildfires hub is a
// live page over the federal perimeter feed — no catalogue date;
// its per-incident URLs are live-derived and join below beside
// transit, outside the pinned set.
const SEO_PAGES_RADAR = [
  "/weather-radar",
  ...RADAR_METROS.map((m) => `/weather-radar/${m.slug}`),
];
const SEO_PAGES_WILDFIRES = ["/wildfires"];

// Per-ship pages (built 2026-10-26, shipped 2026-10-28): the
// cruise-ship tracker hub plus one page per ship in
// src/lib/ships/registry.ts — derived from the same registry the
// pages' generateStaticParams reads, so the two can never drift.
// Only ships with a verified MMSI are in the registry; a ship that
// leaves the AIS feed keeps its page (and its sitemap entry) in the
// "not currently reporting" state rather than being delisted. These
// carry the registry's verification date, not the catalogue date.
const SEO_PAGES_SHIPS = ["/ships", ...SHIPS.map((s) => `/ships/${s.slug}`)];

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

// Wave 17 (2026-10-27): the train-webcam walls (keyword wave B) —
// the /train-webcams hub plus one page per place in
// lib/railfan-places (15 km radius walls; yields pinned in
// lib/railfan-page-scopes.test.ts).
const SEO_PAGES_WAVE17 = [
  "/train-webcams",
  ...RAIL_PLACE_SLUGS.map((slug) => `/train-webcams/${slug}`),
];

// Seasonal annuals (2026-10-27): evergreen pages for the five events
// that recur every year — dates come from lib/seasonal-events tables,
// never from prose, so the pages stay correct year to year. Wave C
// (2026-10-27) added six more from the same tables: the Macy's
// parade, the NYC and Boston marathons, the Fourth of July, the Rose
// Parade and the Balloon Fiesta.
const SEO_PAGES_SEASONAL = [
  "/new-years-eve-times-square",
  "/mardi-gras-new-orleans",
  "/cherry-blossoms-washington-dc",
  "/oktoberfest-munich",
  "/fall-foliage-cameras",
  "/macys-thanksgiving-parade",
  "/nyc-marathon",
  "/fourth-of-july-fireworks",
  "/boston-marathon",
  "/rose-parade",
  "/albuquerque-balloon-fiesta",
];

// ISS city passes (Menu #2 Wave C, 2026-10-27): the /iss-over hub
// plus one page per city in lib/iss-passes — derived from the same
// registry the routes' generateStaticParams reads, so the sitemap
// cannot drift from the pages that exist. The pages recompute from
// the live TLE hourly, so they carry no lastmod.
const SEO_PAGES_ISS = [
  "/iss-over",
  ...ISS_CITIES.map((c) => `/iss-over/${c.slug}`),
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
// The /alternatives hub itself was added by chunk C7 (2026-10-27) —
// before that, /alternatives 301'd to /compare and the 12 switching
// guides had no parent listing.
const SEO_PAGES_COMPARE = [
  "/alternatives",
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

/**
 * Transit SEO pages (2026-10-26): the /transit hub family generated
 * from the agency registry (lib/transit/seo) — national hub, state +
 * agency hubs, and one URL per route. Deliberately NO stop URLs:
 * stop pages were an owner-rejected thin-page risk; stops live on
 * the route pages. lastModified is the GTFS feed's own version date.
 * A feed that fails to load at sitemap time omits its URLs rather
 * than failing the whole sitemap.
 */
async function transitSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [
    { url: `${BASE}/transit`, changeFrequency: "weekly", priority: 0.7 },
  ];
  const seen = new Set<string>(["/transit"]);
  for (const agency of seoAgencies()) {
    try {
      const d = await agencySeoData(agency);
      const feedDate = feedVersionDate(d.net.feedVersion) ?? undefined;
      for (const e of transitPathsForAgency(agency, d.net, d.slugs)) {
        // A state hub is emitted once per agency in it (batch 2 put
        // two agencies in Washington); a sitemap must not repeat a URL.
        if (seen.has(e.path)) continue;
        seen.add(e.path);
        out.push({
          url: `${BASE}${e.path}`,
          ...(feedDate ? { lastModified: feedDate } : {}),
          changeFrequency: e.changeFrequency,
          priority: e.priority,
        });
      }
    } catch { /* agency feed unavailable — its URLs return when it is */ }
  }
  return out;
}

// Live wildfire incident URLs (Menu #2 Wave C part 2, 2026-10-28):
// one entry per incident the NIFC WFIGS feed currently names — the
// same live-derived shape as the transit entries above. An incident
// URL exists exactly while its page does (the page 404s when the
// feed drops the incident), so the set is pinned structurally in
// the tests, never byte-exactly. lastModified is the perimeter's
// own timestamp — the artefact the page's content derives from.
// Feed unavailable → the section is empty and returns with it.
async function wildfireSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const incidents = await getWildfireIncidents();
    return incidents.map((i) => ({
      url: `${BASE}/wildfires/${i.slug}`,
      ...(i.properties.updated ? { lastModified: new Date(i.properties.updated) } : {}),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));
  } catch {
    return [];
  }
}

// Localized entries (multilingual SEO, 2026-10-26; rebased 2026-10-27):
// changeFrequency / priority mirror each slug's English entry above; the
// URLs, lastModified and hreflang maps are derived from the publication
// manifest (src/i18n/manifest.ts) so a new page × locale ships here by
// adding a manifest entry, never by editing this table's data.
const LOCALIZED_FREQ: Record<
  string,
  { changeFrequency: "daily" | "weekly" | "monthly"; priority: number }
> = {
  "": { changeFrequency: "daily", priority: 1.0 },
  pricing: { changeFrequency: "weekly", priority: 0.9 },
  "live-webcams": { changeFrequency: "monthly", priority: 0.6 },
  faq: { changeFrequency: "monthly", priority: 0.6 },
  "live-flight-tracker": { changeFrequency: "weekly", priority: 0.8 },
  "ship-tracker": { changeFrequency: "monthly", priority: 0.6 },
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const transitEntries = await transitSitemapEntries();
  const wildfireEntries = await wildfireSitemapEntries();
  // Honest lastmod (SEO #11, 2026-10-26; completed by the index-recovery
  // remainder, 2026-10-27): every URL used to be stamped "now" on every
  // render, which teaches crawlers to distrust the signal. The rule now:
  // an entry carries lastModified only when it equals the date of a real
  // artefact the page's content derives from — a dataset's `generatedAt`,
  // a post's own date/revision, the methodology page's REVISED stamp, or
  // a GTFS feed's version date. Sets with no honest date source in the
  // repo (static marketing, compare/alternatives — the competitor JSONs
  // carry no date field — trackers and other live surfaces) omit
  // lastModified entirely. The URL set, order, changeFrequency and
  // priority are unchanged. A future date is never emitted (the
  // withoutFutureLastmod pass at the return): an artefact date ahead
  // of today — a post dated tomorrow, a feed validity end date — is
  // dropped until it is real, because future lastmods teach crawlers
  // to distrust the whole file (SEO audit 2026-10-27, fix #2).
  //
  // The catalogue date is camera-countries.json's generatedAt: the
  // moment tools/build-country-pages.mjs built the committed catalogue
  // snapshot (the src/data/countries/*.json chunks every catalogue wall
  // below renders from, via lib/explore-data). It is a data-build date,
  // not a deploy stamp — it has not moved since 2026-10-20 despite
  // dozens of ships, and it advances only when the snapshot is rebuilt,
  // which is exactly when those pages' content changes.
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
  // WorldEye News section front: dated by the newest flagged story
  // (flagged posts are the news vertical — see src/lib/news.ts). The
  // stories themselves are already in this sitemap at their blog URLs.
  const newsPosts = POSTS.filter((p) => p.news);
  const latestNewsDate =
    newsPosts.length > 0
      ? new Date(
          newsPosts.reduce(
            (max, p) => {
              const d = p.updated ?? p.date;
              return d > max ? d : max;
            },
            newsPosts[0].updated ?? newsPosts[0].date,
          ),
        )
      : undefined;
  // Family dates for entries whose wave arrays mix them with undated
  // pages: hubs that enumerate a dated dataset, and the catalogue
  // walls/hubs scattered through the early waves. Keyed by path so wave
  // membership and URL order are untouched; anything not listed here
  // and not stamped by its own mapping below stays undated.
  const familyLastmod = new Map<string, Date>([
    // Hubs over the city dataset (the /city-webcams hub and the world
    // hub both enumerate city-pages.json).
    ["/city-webcams", cityPagesDate],
    ["/world-city-webcams", cityPagesDate],
    // The traffic hub enumerates the same state index its children
    // are stamped with (src/data/us-states.json via lib/us-states).
    ["/us-traffic-cameras", statesDate],
    // The ski hub renders the resort dataset (lib/ski-resorts).
    ["/ski-webcams", skiDate],
    // Directory hubs whose walls render from the catalogue snapshot.
    ["/live-webcams", catalogueDate],
    ["/europe-live-cameras", catalogueDate],
    ["/live-traffic-cameras", catalogueDate],
    // The ten editorial cities (Waves 4–6): the same [city] route and
    // snapshot camera walls as the generated tier — the audit found
    // them undated while their siblings carried the batch date.
    ["/city-webcams/london", catalogueDate],
    ["/city-webcams/ottawa", catalogueDate],
    ["/city-webcams/toronto", catalogueDate],
    ["/city-webcams/madrid", catalogueDate],
    ["/city-webcams/houston", catalogueDate],
    ["/city-webcams/dallas", catalogueDate],
    ["/city-webcams/tokyo", catalogueDate],
    ["/city-webcams/sydney", catalogueDate],
    ["/city-webcams/auckland", catalogueDate],
    ["/city-webcams/fort-worth", catalogueDate],
    // Wave 5's two catalogue-wall hubs (their children stamp already).
    ["/beach-webcams", catalogueDate],
    ["/airport-webcams", catalogueDate],
    // Wave 7's country traffic hubs: explore-data walls like Wave 13.
    ["/japan-traffic-cameras", catalogueDate],
    ["/canada-traffic-cameras", catalogueDate],
    ["/spain-traffic-cameras", catalogueDate],
    ["/south-korea-traffic-cameras", catalogueDate],
    ["/germany-traffic-cameras", catalogueDate],
    ["/norway-traffic-cameras", catalogueDate],
    ["/sweden-traffic-cameras", catalogueDate],
  ]);
  const withFamilyLastmod = (p: string): { lastModified?: Date } => {
    const d = familyLastmod.get(p);
    return d ? { lastModified: d } : {};
  };
  const entries: MetadataRoute.Sitemap = [
    // The homepage is the live globe app — its data is the runtime
    // catalogue, not the committed snapshot — so it carries no lastmod
    // rather than borrowing the catalogue's date.
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1.0, alternates: { languages: hreflangMapFor("") } },
    { url: `${BASE}/features`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/gods-eye-view`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/cameras`, lastModified: catalogueDate, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/live-flight-tracker`, changeFrequency: "weekly", priority: 0.8, alternates: { languages: hreflangMapFor("live-flight-tracker") } },
    { url: `${BASE}/satellite-tracker`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/earthquake-tracker`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/tornado-tracker`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/pricing`, changeFrequency: "weekly", priority: 0.9, alternates: { languages: hreflangMapFor("pricing") } },
    { url: `${BASE}/blog`, lastModified: latestPostDate, changeFrequency: "weekly", priority: 0.7 },
    ...POSTS.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.updated ?? p.date),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${BASE}/news`, lastModified: latestNewsDate, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/news/editorial-standards`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/news/authors/jameson-lythgoe`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/affiliates`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/affiliates/leaderboard`, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/affiliates/terms`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.6, alternates: { languages: hreflangMapFor("faq") } },
    { url: `${BASE}/changelog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/security`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    // Camera directory (sitemap-only SEO pages — not linked from site chrome).
    { url: `${BASE}/cameras/countries`, lastModified: catalogueDate, changeFrequency: "monthly", priority: 0.7 },
    ...SEO_PAGES.filter((p) => p !== "/cameras/countries").map((p) => ({
      url: `${BASE}${p}`,
      ...withFamilyLastmod(p),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(p === "/live-webcams"
        ? { alternates: { languages: hreflangMapFor("live-webcams") } }
        : {}),
    })),
    ...SEO_PAGES_WAVE4.map((p) => ({
      url: `${BASE}${p}`,
      ...withFamilyLastmod(p),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE5.map((p) => ({
      url: `${BASE}${p}`,
      ...withFamilyLastmod(p),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(p === "/ship-tracker"
        ? { alternates: { languages: hreflangMapFor("ship-tracker") } }
        : {}),
    })),
    ...SEO_PAGES_WAVE6.map((p) => ({
      url: `${BASE}${p}`,
      ...withFamilyLastmod(p),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WAVE7.map((p) => ({
      url: `${BASE}${p}`,
      ...withFamilyLastmod(p),
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
    ...SEO_PAGES_TUTORIALS.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
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
    ...SEO_PAGES_ENTERPRISE.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...SEO_PAGES_ORPHANS.map((p) => ({
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
    ...SEO_PAGES_VOLCANOES.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_AURORA_PLACES.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_ICONIC_PLACES.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_LAUNCH_SITES.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_ANIMALS.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_UNIVERSITIES.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_FERRIES.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_CRUISE_PORTS.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_RADAR.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: catalogueDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...SEO_PAGES_WILDFIRES.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...SEO_PAGES_SHIPS.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: new Date(REGISTRY_VERIFIED_AT),
      changeFrequency: "daily" as const,
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
    ...SEO_PAGES_WAVE17.map((p) => ({
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
    ...SEO_PAGES_ISS.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
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
    ...transitEntries,
    ...wildfireEntries,
    // Localized pages (multilingual SEO foundation, 2026-10-26): one
    // entry per manifest-published page × locale, derived from the
    // manifest so this block never drifts from what actually routes.
    // lastModified is the manifest's translation date — honest, never
    // request-time "now".
    ...MANIFEST_ENTRIES.filter((e) => e.status === "published").map((e) => {
      const freq = LOCALIZED_FREQ[e.slug] ?? {
        changeFrequency: "monthly" as const,
        priority: 0.6,
      };
      return {
        url: localizedUrl(e.slug, e.locale),
        ...(e.updatedAt ? { lastModified: new Date(e.updatedAt) } : {}),
        changeFrequency: freq.changeFrequency,
        priority: freq.priority,
        alternates: { languages: hreflangMapFor(e.slug) },
      };
    }),
  ];
  // Fix #2 backstop: no entry leaves with a future lastModified,
  // whatever artefact it derived from.
  return entries.map((e) => withoutFutureLastmod(e, new Date()));
}
