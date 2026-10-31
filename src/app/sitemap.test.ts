import { createHash } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { POSTS } from "./(en)/blog/posts";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import usStates from "@/data/us-states.json";
import skiResorts from "@/data/ski-resorts.json";
import liveCameraIndex from "@/data/live-camera-index.json";
import cameraNetworkReport from "@/data/camera-network-2026-10.json";
import { MANIFEST_ENTRIES } from "@/i18n/manifest";
import { hreflangMapFor } from "@/lib/i18n-seo";
import { REGISTRY_VERIFIED_AT, SHIPS } from "@/lib/ships/registry";

/**
 * Sitemap lastmod policy pins (index-recovery remainder, 2026-10-27).
 *
 * The rule: an entry carries lastModified only when it equals the date
 * of a real artefact the page's content derives from — a dataset's
 * generatedAt, a post's own date, the methodology page's REVISED
 * stamp, or a GTFS feed's version date (see sitemap.ts). Everything
 * else omits it. Expected dates below are read from the data files
 * themselves, so a legitimate data rebuild moves the pins with it;
 * what is pinned is WHICH artefact dates WHICH family.
 *
 * URL-set invariance: the non-transit set is fully determined by
 * committed data, so its count and a hash of the sorted URLs are
 * pinned exactly — any URL added, removed or renamed breaks this
 * test. (Baseline: the pre-change generator on 2026-10-27, 815
 * URLs; 816 since chunk C7 added the /alternatives hub the same
 * day; 939 since the city-scale wave added 123 generated city pages
 * at the >=25 owned-camera tier later that day; 945 since the
 * i18n rebase added the six manifest-published /es URLs; 968 since
 * Menu #2 Wave A added 10 per-volcano pages and 13 per-place aurora
 * pages, both from committed registries; 928 since C10 threshold
 * enforcement consolidated 35 below-line countries into their
 * regional hubs and folded 5 ski resorts into the /ski-webcams
 * hub; 935 since Menu #2 Wave A part 2 added the /iconic-places
 * hub + 4 place pages and the /launch-sites hub + 1 site page,
 * both from committed registries; 974 since Menu #2 Wave B part 1
 * added the /animal-webcams hub + 12 animal star pages and the
 * /university-webcams hub + 25 per-university pages, all from
 * committed registries; 987 since Menu #2 Wave B part 2 added the
 * /ferry-tracker hub + 3 ferry system pages and 9 cruise-port
 * board pages, all from committed registries; 1,014 since Menu #2
 * Wave C part 1 added the six Wave C seasonal-annual pages (Macy's
 * parade, NYC marathon, July 4 fireworks, Boston marathon, Rose
 * Parade, Balloon Fiesta) and the /iss-over hub + 20 city pages
 * from the committed lib/iss-passes registry; 1,037 since Menu #2
 * Wave C part 2 added the /weather-radar hub + 21 metro pages
 * from a committed registry and the /wildfires hub; 1,052 since
 * the per-ship pages shipped, adding the /ships hub + 14 per-ship
 * pages from the committed lib/ships registry). Transit URLs
 * depend on live GTFS feeds, so they are pinned
 * structurally instead: present, unique, and every lastmod a
 * plausible feed-vintage date. The per-incident /wildfires/<slug>
 * URLs are live-derived from the NIFC WFIGS feed the same way —
 * excluded from the pinned set below and pinned structurally in
 * their own describe.
 */

const BASE = "https://worldeye.app";
const generatedAt = (d: unknown) =>
  new Date((d as { generatedAt: string }).generatedAt).toISOString();
const CATALOGUE = generatedAt(cameraCountries);
const CITY = generatedAt(cityPages);
const STATES = generatedAt(usStates);
const SKI = generatedAt(skiResorts);

type Row = { url: string; lastModified: string | null };

let rows: Row[] = [];
let byUrl = new Map<string, string | null>();
let rawEntries: Awaited<ReturnType<typeof sitemap>> = [];
let rawByUrl = new Map<string, (typeof rawEntries)[number]>();

beforeAll(async () => {
  const entries = await sitemap();
  rawEntries = entries;
  rawByUrl = new Map(entries.map((e) => [e.url, e]));
  rows = entries.map((e) => ({
    url: e.url,
    lastModified: e.lastModified
      ? new Date(e.lastModified).toISOString()
      : null,
  }));
  byUrl = new Map(rows.map((r) => [r.url, r.lastModified]));
}, 600_000);

const lm = (path: string) => byUrl.get(`${BASE}${path}`);

describe("sitemap URL set", () => {
  it("has no duplicate URLs", () => {
    expect(byUrl.size).toBe(rows.length);
  });

  it("keeps the non-transit URL set byte-identical to the pre-change generator", () => {
    const nonTransit = rows
      .map((r) => r.url)
      .filter(
        (u) =>
          !u.startsWith(`${BASE}/transit`) &&
          !u.startsWith(`${BASE}/wildfires/`),
      )
      .sort();
    expect(nonTransit.length).toBe(1141);
    const hash = createHash("sha256").update(nonTransit.join("\n")).digest("hex");
    // Hash history: 6d75d0de… until the SEO audit fix #3 (2026-10-27)
    // normalised the es homepage entry from /es/ to its final /es
    // form — same 945 URLs, one string changed (17582f29…). Menu #2
    // Wave A (2026-10-27) then added the 23 per-volcano and
    // per-place aurora URLs → 968. C10 threshold enforcement
    // (2026-10-28) then removed the 35 consolidated country pages
    // and 5 folded ski resort pages → 928 (8584c79e…). Menu #2 Wave A
    // part 2 (2026-10-28) then added the 7 iconic-places and
    // launch-sites URLs → 935. Menu #2 Wave B part 1 (2026-10-28)
    // then added the animal hub + 12 star pages and the university
    // hub + 25 per-university pages → 974. Menu #2 Wave B part 2
    // (2026-10-28) then added the ferry hub + 3 system pages and 9
    // cruise-port board pages → 987. Menu #2 Wave C part 1
    // (2026-10-28) then added the 6 Wave C seasonal annuals and the
    // 21 iss-over hub + city URLs → 1,014. Menu #2 Wave C part 2
    // (2026-10-28) then added the weather-radar hub + 21 metro
    // pages and the /wildfires hub → 1,037 (per-incident wildfire
    // URLs are live-derived and filtered out of this set). The
    // per-ship pages (built 2026-10-26, shipped 2026-10-28) then
    // added the /ships hub + 14 per-ship pages from the committed
    // lib/ships registry → 1,052. Delta hand-verified: removing
    // exactly those 15 URLs reproduces the 1,037 set and the
    // 4c13bb37… hash byte-for-byte. The WorldEye News section
    // (2026-10-28) then added the /news front page, the editorial
    // standards page and the author profile → 1,055 (the flagged
    // news stories themselves were already listed at their blog
    // URLs). Delta hand-verified: removing exactly those 3 URLs
    // reproduces the 1,052 set and the e14944c6… hash byte-for-byte.
    // The WiFi Sensing tool (2026-10-29) then added /sensing → 1,056.
    // Delta hand-verified: the production sitemap's non-transit set
    // reproduces the 1,055 set and the 6eb73a81… hash byte-for-byte,
    // and removing exactly /sensing from the new set does the same.
    // The competitor head-to-head wave 1 (2026-10-29) then added the
    // two /compare/<a>-vs-<b> pair URLs → 1,058. Delta: removing
    // exactly those 2 URLs reproduces the 1,056 set and the
    // 2080493c… hash byte-for-byte. Wave 2 (2026-10-29) then added
    // the three remaining pair URLs (windy-vs-ventusky,
    // marinetraffic-vs-vesselfinder, google-earth-vs-nasa-worldview)
    // → 1,061. Competitor-vs-competitor wave 2 (2026-10-29) then
    // added the 13 God's Eye View / GodsView AI head-to-head pair
    // URLs (gods-eye-view-vs-* ×9, godsview-vs-* ×4) → 1,074.
    // Delta hand-verified: removing exactly those 13 URLs
    // reproduces the 1,061 set and the b6d93150… hash byte-for-byte.
    // Competitor-vs-competitor wave 2B (2026-10-29) then added the
    // 12 Argos Atlas / flight-tracker / AIS head-to-head pair URLs
    // → 1,086. Delta hand-verified: removing exactly those 12 URLs
    // reproduces the 1,074 set and the 1f29ca5e… hash byte-for-byte.
    // Competitor-vs-competitor wave 2C (2026-10-29) then added the
    // final 12 head-to-head pair URLs (webcam/satellite/OSINT
    // clusters) → 1,098. Delta hand-verified: removing exactly
    // those 12 URLs reproduces the 1,086 set and the 52a52ab4…
    // hash byte-for-byte. The Keyword Gap Programme (2026-10-29)
    // then added /beach-webcams/key-west (29 verified FDOT island
    // cameras, the beach family's tenth spot) → 1,099. Delta
    // hand-verified: removing exactly that URL reproduces the
    // 1,098 set and the a1fe3060… hash byte-for-byte. The White
    // Label page (2026-10-29) then added /white-label (the
    // early-access pilot programme page) → 1,100. Delta: removing
    // exactly that URL reproduces the 1,099 set and the
    // 24d40d31… hash byte-for-byte. The ski expansion
    // (2026-10-30) then added 12 resort pages (alta, angel-fire,
    // blue-mountain-ontario, chamonix, deer-valley, hoodoo,
    // june-mountain, oppdal, perisher, pyha, red-river,
    // sun-valley) → 1,112. Delta hand-verified against the
    // production sitemap: exactly those 12 additions, no
    // removals, reproducing the a49057a2… hash byte-for-byte.
    // The White Label announcement post (2026-10-30) then added
    // /blog/worldeye-white-label → 1,113. Delta: removing exactly
    // that URL reproduces the 1,112 set and the a49057a2… hash.
    // The Daily Blog 2026-10-29 batch (shipped 2026-10-30,
    // recomposed from the batch's source record after the original
    // staging was destroyed by an EPERM truncating write) then
    // added the three sourced news posts
    // (halloween-aurora-g1-storm-watch,
    // spacex-starlink-launch-vandenberg-october-30,
    // colorado-ski-season-opens-keystone-arapahoe-basin) → 1,116.
    // Delta hand-verified: removing exactly those 3 URLs
    // reproduces the 1,113 set and the be9f132b… hash byte-for-byte.
    // The Daily Blog 2026-10-30 batch (shipped 2026-10-30)
    // then added the two sourced news posts
    // (iss-spacewalk-100-seventh-solar-array,
    // super-typhoon-in-fa-northern-mariana-islands) → 1,118.
    // (A third staged story, Keystone opening day, was dropped
    // as a duplicate of the Oct 29 Colorado ski-season post.)
    // Delta hand-verified: removing exactly those 2 URLs
    // reproduces the 1,116 set and the 6012a76e… hash byte-for-byte.
    // The recon tool pages (2026-10-30) then added the /tools hub
    // and 22 per-tool pages → 1,141, and the camera-roster rollout
    // (2026-10-30) added the /city-webcams/mcalester city page
    // → 1,142. Delta hand-verified: removing exactly those 24 URLs
    // reproduces the 1,118 set and the 71edeb7b… hash byte-for-byte.
    // The site-audit Wave 2 R30 consolidation (2026-10-31) then
    // removed /macys-thanksgiving-parade-2026 → 1,141: INVERTED
    // versus the marathon pattern, the undated evergreen page is
    // canonical and the dated shell is retired (301 in
    // next.config.ts). Delta hand-verified: removing exactly that
    // URL reproduces the 1,142 set and the cc960cf3… hash
    // byte-for-byte.
    expect(hash).toBe(
      "e47811a6fe1cedfadfbfb8c1d3c06b68e034a119194ff105898f49c146ff5065",
    );
  });

  it("still lists transit URLs from the live feeds", () => {
    const transit = rows.filter((r) => r.url.startsWith(`${BASE}/transit`));
    // R17 index policy (2026-10-31): the sitemap carries only the
    // indexable subset — national/state/agency hubs + rail, BRT and
    // flagship bus routes. With every feed up that is ~170 URLs; a
    // feed that fails to load at sitemap time omits its agency
    // (pre-existing behaviour), so the floor only insists the family
    // is really there (22 hubs max → >40 means route keepers are
    // in), while the ceiling is the policy invariant: nowhere near
    // the ~1,300 route URLs the family used to list.
    expect(transit.length).toBeGreaterThan(40);
    expect(transit.length).toBeLessThan(400);
    expect(transit.some((r) => r.url === `${BASE}/transit`)).toBe(true);
    expect(transit.some((r) => /shuttle/i.test(r.url))).toBe(false);
  });

  it("lists live wildfire incident URLs structurally (feed-derived, never pinned)", () => {
    const incidents = rows.filter((r) => r.url.startsWith(`${BASE}/wildfires/`));
    const seen = new Set<string>();
    for (const r of incidents) {
      const slug = r.url.slice(`${BASE}/wildfires/`.length);
      expect(slug, r.url).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(seen.has(r.url), r.url).toBe(false);
      seen.add(r.url);
      if (r.lastModified) {
        // The perimeter's own timestamp — past, plausible, never future.
        const t = Date.parse(r.lastModified);
        expect(t, r.url).toBeGreaterThanOrEqual(Date.parse("2020-01-01"));
        expect(t, r.url).toBeLessThanOrEqual(Date.now());
      }
    }
    // The hub itself is a committed URL and stays in the pinned set.
    expect(byUrl.has(`${BASE}/wildfires`)).toBe(true);
  });
});

describe("sitemap lastmod policy", () => {
  it("leaves the homepage undated (live app surface, not snapshot content)", () => {
    expect(lm("/")).toBeNull();
  });

  it("dates the catalogue families with the catalogue snapshot's generatedAt", () => {
    expect(lm("/cameras")).toBe(CATALOGUE);
    expect(lm("/cameras/countries")).toBe(CATALOGUE);
    expect(lm("/cameras/countries/japan")).toBe(CATALOGUE);
    expect(lm("/airport-webcams/atl-hartsfield-jackson")).toBe(CATALOGUE);
    for (const p of [
      "/live-webcams",
      "/europe-live-cameras",
      "/live-traffic-cameras",
      "/beach-webcams",
      "/airport-webcams",
      "/japan-traffic-cameras",
      "/germany-traffic-cameras",
    ]) {
      expect(lm(p), p).toBe(CATALOGUE);
    }
  });

  it("dates the Menu #2 Wave A pages (per-volcano, per-place aurora) with the catalogue snapshot", () => {
    for (const slug of [
      "kilauea", "reykjanes", "katla", "etna", "vesuvius",
      "sakurajima", "merapi", "bromo", "fuji", "ruapehu",
    ]) {
      expect(lm(`/volcano-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
    for (const slug of [
      "fairbanks", "anchorage", "duluth", "marquette", "churchill",
      "reykjavik", "akureyri", "tromso", "alta", "lofoten",
      "rovaniemi", "levi", "abisko",
    ]) {
      expect(lm(`/northern-lights-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
  });

  it("dates the Menu #2 Wave B1 pages (animal hub + stars, university hub + pages) with the catalogue snapshot", () => {
    expect(lm("/animal-webcams")).toBe(CATALOGUE);
    for (const slug of [
      "tembe-elephant-park", "masai-mara", "nkorho-kruger", "olifants-river",
      "tsavo-east", "san-diego-zoo", "kumamoto-city-zoo", "gaia-zoo",
      "belize-zoo", "awaji-island-monkey-center", "hula-nature-reserve",
      "konya-animal-shelter",
    ]) {
      expect(lm(`/animal-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
    expect(lm("/university-webcams")).toBe(CATALOGUE);
    for (const slug of [
      "uc-santa-barbara", "vanderbilt-university", "columbia-university",
      "boston-university", "furman-university", "michigan-state-university",
      "west-virginia-university", "warren-wilson-college",
      "worcester-state-university", "university-of-hawaii-manoa",
      "navajo-technical-university", "cuny", "university-of-twente",
      "newcastle-university", "university-of-bristol", "tu-berlin",
      "bucharest-university-of-economic-studies", "ansan-university",
      "dongeui-university", "kyungpook-national-university",
      "jeonnam-university", "silla-university",
      "incheon-catholic-university", "incheon-global-campus",
      "yonsei-university",
    ]) {
      expect(lm(`/university-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
  });

  it("dates the Menu #2 Wave C part 2 radar pages with the catalogue snapshot and leaves the wildfires hub undated", () => {
    expect(lm("/weather-radar")).toBe(CATALOGUE);
    for (const slug of [
      "atlanta", "dallas", "salt-lake-city", "houston", "minneapolis",
      "orlando", "portland", "seattle", "tampa", "washington-dc",
      "new-york-city", "denver", "philadelphia", "las-vegas",
      "los-angeles", "kansas-city", "norfolk-virginia-beach", "phoenix",
      "san-antonio", "jacksonville", "st-louis",
    ]) {
      expect(lm(`/weather-radar/${slug}`), slug).toBe(CATALOGUE);
    }
    // The hub is a live view over the federal feed — no honest date.
    expect(lm("/wildfires")).toBeNull();
  });

  it("dates the per-ship pages with the registry verification date", () => {
    const verified = new Date(REGISTRY_VERIFIED_AT).toISOString();
    expect(lm("/ships")).toBe(verified);
    for (const s of SHIPS) {
      expect(lm(`/ships/${s.slug}`), s.slug).toBe(verified);
    }
  });

  it("dates the ten editorial cities like their generated siblings' walls", () => {
    for (const slug of [
      "london", "ottawa", "toronto", "madrid", "houston",
      "dallas", "tokyo", "sydney", "auckland", "fort-worth",
    ]) {
      expect(lm(`/city-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
  });

  it("dates city pages and hubs with the city dataset's generatedAt", () => {
    expect(lm("/city-webcams/austin")).toBe(CITY);
    expect(lm("/city-webcams")).toBe(CITY);
    expect(lm("/world-city-webcams")).toBe(CITY);
  });

  it("dates state pages and their hub with the state index's generatedAt", () => {
    expect(lm("/us-traffic-cameras/utah")).toBe(STATES);
    expect(lm("/us-traffic-cameras")).toBe(STATES);
  });

  it("dates ski pages and their hub with the ski dataset's generatedAt", () => {
    expect(lm("/ski-webcams/park-city")).toBe(SKI);
    expect(lm("/ski-webcams")).toBe(SKI);
    expect(lm("/ski-webcams/compare")).toBe(SKI);
  });

  it("dates the index and report pages with their own files' generatedAt", () => {
    expect(lm("/live-camera-index")).toBe(generatedAt(liveCameraIndex));
    expect(lm("/reports/camera-network-2026-10")).toBe(
      generatedAt(cameraNetworkReport),
    );
  });

  it("dates methodology with the page's own revision stamp", () => {
    expect(lm("/methodology")).toBe("2026-10-27T00:00:00.000Z");
  });

  it("dates blog posts with their own dates and the hub with the latest", () => {
    const first = POSTS[0];
    expect(lm(`/blog/${first.slug}`)).toBe(
      new Date(first.updated ?? first.date).toISOString(),
    );
    const latest = POSTS.reduce(
      (max, p) => {
        const d = p.updated ?? p.date;
        return d > max ? d : max;
      },
      POSTS[0].updated ?? POSTS[0].date,
    );
    expect(lm("/blog")).toBe(new Date(latest).toISOString());
  });

  it("leaves undated everything with no honest date source", () => {
    for (const p of [
      "/features",
      "/pricing",
      "/faq",
      "/compare/acled",
      "/alternatives",
      "/alternatives/windy",
      "/best-osint-tools",
      "/live-plane-spotting",
      "/live-flight-tracker",
      "/ship-tracker",
      "/northern-lights-webcams",
      "/north-america-webcams",
      "/enterprise",
      "/random",
    ]) {
      expect(lm(p), p).toBeNull();
    }
  });

  it("gives every transit lastmod a plausible feed-vintage date", () => {
    const dated = rows.filter(
      (r) => r.url.startsWith(`${BASE}/transit`) && r.lastModified,
    );
    expect(dated.length).toBeGreaterThan(0);
    for (const r of dated) {
      const t = Date.parse(r.lastModified!);
      expect(t, r.url).toBeGreaterThanOrEqual(Date.parse("2020-01-01"));
      expect(t, r.url).toBeLessThan(Date.parse("2028-01-01"));
    }
    // The /transit hub spans every agency's feed — no single vintage.
    expect(lm("/transit")).toBeNull();
  });

  it("never emits a future lastmod (SEO audit fix #2)", () => {
    // The 2026-10-27 audit found 55 future-dated entries — a GTFS
    // validity end date stamped as a version date plus posts dated
    // tomorrow. The generator now drops any artefact date ahead of
    // today instead of emitting it.
    const now = Date.now();
    for (const r of rows) {
      if (!r.lastModified) continue;
      expect(Date.parse(r.lastModified), r.url).toBeLessThanOrEqual(now);
    }
  });
});

/**
 * Localized entries (multilingual foundation, 2026-10-26; merged into
 * this suite by the 2026-10-27 rebase): every manifest-published
 * page × locale appears exactly once with the reciprocal hreflang
 * map; the six English source entries carry the same map; no other
 * entry gained alternates; es entries carry the manifest's
 * translation date as lastModified (never request-time "now").
 */
describe("sitemap — localized entries", () => {
  const ES_SLUGS: Record<string, string> = {
    // The es homepage is the bare /es — /es/ 308-redirects to it, so
    // the sitemap lists the final form (SEO audit 2026-10-27, fix #3).
    "": "https://worldeye.app/es",
    pricing: "https://worldeye.app/es/pricing",
    "live-webcams": "https://worldeye.app/es/live-webcams",
    faq: "https://worldeye.app/es/faq",
    "live-flight-tracker": "https://worldeye.app/es/live-flight-tracker",
    "ship-tracker": "https://worldeye.app/es/ship-tracker",
  };
  const EN_URLS: Record<string, string> = {
    "": "https://worldeye.app/",
    pricing: "https://worldeye.app/pricing",
    "live-webcams": "https://worldeye.app/live-webcams",
    faq: "https://worldeye.app/faq",
    "live-flight-tracker": "https://worldeye.app/live-flight-tracker",
    "ship-tracker": "https://worldeye.app/ship-tracker",
  };

  it("lists each Spanish URL exactly once", () => {
    for (const url of Object.values(ES_SLUGS)) {
      expect(rawEntries.filter((e) => e.url === url)).toHaveLength(1);
    }
    const esEntries = rawEntries.filter(
      (e) =>
        e.url === "https://worldeye.app/es" ||
        e.url.startsWith("https://worldeye.app/es/"),
    );
    expect(esEntries).toHaveLength(6);
  });

  it("gives every es entry the reciprocal hreflang map and the manifest date", () => {
    for (const [slug, esUrl] of Object.entries(ES_SLUGS)) {
      const entry = rawByUrl.get(esUrl);
      expect(entry, esUrl).toBeDefined();
      expect(entry?.alternates?.languages).toEqual(hreflangMapFor(slug));
      const manifestEntry = MANIFEST_ENTRIES.find(
        (e) => e.slug === slug && e.locale === "es",
      );
      expect(entry?.lastModified).toEqual(new Date(manifestEntry!.updatedAt!));
    }
  });

  it("gives the six English entries the identical hreflang map", () => {
    for (const [slug, enUrl] of Object.entries(EN_URLS)) {
      expect(rawByUrl.get(enUrl)?.alternates?.languages, enUrl).toEqual(
        hreflangMapFor(slug),
      );
    }
  });

  it("leaves every other entry without alternates", () => {
    const withAlternates = rawEntries.filter((e) => e.alternates?.languages);
    // 6 English + 6 Spanish, nothing else.
    expect(withAlternates).toHaveLength(12);
    expect(
      rawByUrl.get("https://worldeye.app/features")?.alternates,
    ).toBeUndefined();
  });
});
