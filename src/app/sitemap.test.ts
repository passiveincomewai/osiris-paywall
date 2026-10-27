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
 * i18n rebase added the six manifest-published /es URLs.) Transit URLs
 * depend on live GTFS feeds, so they are pinned
 * structurally instead: present, unique, and every lastmod a
 * plausible feed-vintage date.
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
      .filter((u) => !u.startsWith(`${BASE}/transit`))
      .sort();
    expect(nonTransit.length).toBe(945);
    const hash = createHash("sha256").update(nonTransit.join("\n")).digest("hex");
    expect(hash).toBe(
      "6d75d0de3bd70485d118996485624538f71d436eed25a73b5c209d8a372b64a5",
    );
  });

  it("still lists transit URLs from the live feeds", () => {
    const transit = rows.filter((r) => r.url.startsWith(`${BASE}/transit`));
    expect(transit.length).toBeGreaterThan(500);
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
    "": "https://worldeye.app/es/",
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
    const esEntries = rawEntries.filter((e) =>
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
