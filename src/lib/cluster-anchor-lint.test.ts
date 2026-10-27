import { beforeAll, describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "fs";
import { join } from "path";
import cityPages from "@/data/city-pages.json";
import countriesIndex from "@/data/camera-countries.json";
import directory from "@/data/camera-directory.json";
import { cityChunkStats } from "@/lib/explore-data";
import {
  hasFullNeighbourSet,
  nearestCityNeighbours,
  neighbourLinks,
  possessive,
  type CityPoint,
} from "@/lib/place-neighbours";
import { loadCityBreakdown, stateHubForCity } from "@/lib/place-breakdown";
import {
  countryFacts,
  loadCountryRecords,
  regionLinks,
} from "@/lib/country-page-content";
import { cityPageHrefForArea } from "@/lib/place-answers";
import {
  buildRelatedSearches,
  compassDirection,
  type KindCandidate,
  type RelatedKind,
} from "@/lib/related-searches";

/**
 * Cluster anchor lint + regression pins (INTENT-AND-CLUSTERS §5.3,
 * chunk C12). Three layers:
 *
 *  1. Data-level discipline over the anchor-generating systems —
 *     the C4 neighbour anchors and the C9 related-searches anchors,
 *     built from the REAL catalogue for every place they serve:
 *     no sanctioned shape exceeds ~50% of a family's links, no
 *     anchor is a banned bare form, and every anchor carries a
 *     data token (a place, area, neighbour, kind or stage name).
 *
 *  2. Rendered-page pins — the §5.2 up-links and the C7/C8/C9
 *     blocks exist on real pages, and the C9 block stays dark on a
 *     page whose data can't support it.
 *
 *  3. Static wiring pins — the templates keep passing the page's
 *     existing anchors into the C9 dedupe, the compare template
 *     keeps its C7 hand-off map, and /alternatives is never
 *     redirected away from its hub again.
 */

const KIND_WALLS: Record<RelatedKind, string> = {
  traffic: "/live-traffic-cameras",
  coast: "/beach-webcams",
  transport: "/airport-webcams",
  mountains: "/ski-webcams",
};
const TRAFFIC_LOCAL: Record<string, string> = {
  japan: "/japan-traffic-cameras",
  canada: "/canada-traffic-cameras",
  germany: "/germany-traffic-cameras",
  norway: "/norway-traffic-cameras",
  spain: "/spain-traffic-cameras",
  "south-korea": "/south-korea-traffic-cameras",
  sweden: "/sweden-traffic-cameras",
};
const BANNED = [/^click here$/i, /^learn more$/i, /^here$/i, /^this page$/i];

type GenCity = {
  slug: string;
  name: string;
  countrySlug: string;
  count: number;
};
const GEN_CITIES = (cityPages as { cities: GenCity[] }).cities;
const COUNTRIES = countriesIndex.countries;

let points: CityPoint[] = [];

beforeAll(async () => {
  const built: CityPoint[] = [];
  for (const g of GEN_CITIES) {
    const stats = await cityChunkStats(g.countrySlug, g.name).catch(() => null);
    if (stats?.centroid) {
      built.push({
        slug: g.slug,
        name: g.name,
        countrySlug: g.countrySlug,
        region: null,
        lat: stats.centroid.lat,
        lng: stats.centroid.lng,
      });
    }
  }
  points = built;
}, 600_000);

describe("C4 neighbour anchors — shape discipline over the real catalogue", () => {
  it("no sanctioned shape exceeds half the family's links, and every anchor is a sanctioned shape", () => {
    const shapes = new Map<string, number>();
    let total = 0;
    let pagesWithSets = 0;
    for (const self of points) {
      const neighbours = nearestCityNeighbours(self, points);
      if (!hasFullNeighbourSet(neighbours)) continue;
      pagesWithSets++;
      for (const link of neighbourLinks(neighbours)) {
        total++;
        const neighbour = neighbours.find(
          (n) => `/city-webcams/${n.slug}` === link.href,
        );
        expect(neighbour, link.href).toBeDefined();
        const shape = link.label
          .replace(possessive(neighbour!.name), "{Place}")
          .replace(neighbour!.name, "{Place}");
        shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
      }
    }
    expect(pagesWithSets).toBeGreaterThan(50);
    expect(total).toBeGreaterThan(150);
    for (const [shape, count] of shapes) {
      expect(
        ["{Place} webcams", "live cameras in {Place}", "{Place} camera index"],
        `unexpected neighbour anchor shape: ${shape}`,
      ).toContain(shape);
      expect(count / total, `shape "${shape}" share`).toBeLessThanOrEqual(0.5);
    }
  }, 600_000);
});

describe("C9 related-searches anchors — discipline over real place data", () => {
  it("every country: block is dark or carries ≥3 unique, data-tokened anchors", async () => {
    for (const c of COUNTRIES) {
      const records = await loadCountryRecords(c.slug).catch(() => []);
      const facts = countryFacts(c, records, COUNTRIES);
      const region = regionLinks(c.slug, COUNTRIES);
      const kinds: KindCandidate[] = facts.themes
        .filter((t) =>
          ["traffic", "coast", "transport", "mountains"].includes(t.key),
        )
        .map((t) => {
          const kind = t.key as RelatedKind;
          const local =
            kind === "traffic" ? TRAFFIC_LOCAL[c.slug] : undefined;
          return {
            kind,
            count: t.count,
            wallHref: KIND_WALLS[kind],
            ...(local ? { localHref: local, localAnchor: `${c.name} traffic cameras` } : {}),
          };
        });
      const areas = c.topCities
        .map((a) => {
          const href = cityPageHrefForArea(c.slug, a.name);
          return href ? { name: a.name, href, count: a.count } : null;
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);
      const out = buildRelatedSearches({
        placeName: c.name,
        kinds,
        areas,
        neighbours: [],
        parent: region?.hub
          ? {
              anchor: `Live cameras across ${region.label}`,
              href: region.hub.href,
              subtext: "region",
            }
          : null,
        usedAnchors: [],
      });
      if (out.length === 0) continue;
      expect(out.length, c.slug).toBeGreaterThanOrEqual(3);
      expect(out.length, c.slug).toBeLessThanOrEqual(6);
      const anchors = out.map((s) => s.anchor);
      expect(new Set(anchors).size, c.slug).toBe(anchors.length);
      const hrefs = out.map((s) => s.href);
      expect(new Set(hrefs).size, c.slug).toBe(hrefs.length);
      for (const s of out) {
        for (const b of BANNED) expect(s.anchor, c.slug).not.toMatch(b);
        const tokens = [
          c.name,
          ...areas.map((a) => a.name),
          "worldwide",
          region?.label ?? "\u0000",
        ];
        expect(
          tokens.some((t) => s.anchor.includes(t)),
          `${c.slug}: anchor "${s.anchor}" carries no data token`,
        ).toBe(true);
      }
    }
  }, 600_000);

  it("sampled cities: same discipline, and Seattle earns a distance neighbour", async () => {
    const sample = GEN_CITIES.filter((g) =>
      [
        "seattle",
        "los-angeles",
        "hampton",
        "birmingham",
        "nagano-city",
        "leon",
        "vasteras",
      ].includes(g.slug),
    );
    expect(sample.length).toBeGreaterThanOrEqual(5);
    for (const g of sample) {
      const self = points.find((p) => p.slug === g.slug);
      const breakdown = await loadCityBreakdown(g.countrySlug, g.name).catch(
        () => null,
      );
      const MIX_TO_KIND: Record<string, RelatedKind> = {
        "Roads & traffic": "traffic",
        "Coast & harbour": "coast",
        "Airports & stations": "transport",
        "Mountains & ski": "mountains",
      };
      const kinds: KindCandidate[] = (breakdown?.mix ?? [])
        .filter((row) => MIX_TO_KIND[row.name] !== undefined)
        .map((row) => {
          const kind = MIX_TO_KIND[row.name];
          const local =
            kind === "traffic" ? TRAFFIC_LOCAL[g.countrySlug] : undefined;
          return {
            kind,
            count: row.count,
            wallHref: KIND_WALLS[kind],
            ...(local
              ? { localHref: local, localAnchor: `${possessive(g.name)} road cameras` }
              : {}),
          };
        });
      const neighbours = self
        ? nearestCityNeighbours(self, points, { limit: 4 }).map((n) => ({
            name: n.name,
            href: `/city-webcams/${n.slug}`,
            distanceKm: n.distanceKm,
            direction: compassDirection(self, n),
          }))
        : [];
      const countryEntry = directory.countries.find(
        (d) => d.slug === g.countrySlug,
      );
      const stateHub = stateHubForCity(
        g.countrySlug,
        g.name,
        self ? { lat: self.lat, lng: self.lng } : null,
      );
      const out = buildRelatedSearches({
        placeName: g.name,
        kinds,
        areas: [],
        neighbours,
        parent: countryEntry
          ? {
              anchor: `All cameras in this country`,
              href: `/cameras/countries/${g.countrySlug}`,
              subtext: "parent",
            }
          : null,
        extraParent: stateHub
          ? {
              anchor: `${stateHub.name} traffic cameras statewide`,
              href: `/us-traffic-cameras/${stateHub.slug}`,
              subtext: "state",
            }
          : null,
        usedAnchors: [],
      });
      if (out.length > 0) {
        expect(out.length, g.slug).toBeGreaterThanOrEqual(3);
        const anchors = out.map((s) => s.anchor);
        expect(new Set(anchors).size, g.slug).toBe(anchors.length);
        for (const s of out) {
          for (const b of BANNED) expect(s.anchor, g.slug).not.toMatch(b);
        }
      }
      if (g.slug === "seattle") {
        const rule3 = out.filter((s) => s.rule === 3);
        expect(rule3.length).toBeGreaterThanOrEqual(1);
        expect(rule3[0].subtext).toMatch(/^\d+ km (north|south|east|west)/);
      }
    }
  }, 600_000);
});

describe("rendered pages — §5.2 up-links and the C8/C9 blocks", () => {
  it("a generated city page links up to its country and shows related searches", async () => {
    const Page = (await import("@/app/city-webcams/[city]/page")).default;
    const el = await Page({ params: Promise.resolve({ city: "seattle" }) });
    const html = renderToString(el as React.ReactElement);
    expect(html).toContain('href="/cameras/countries/united-states"');
    expect(html).toMatch(
      /(Keep exploring Seattle|More ways to look at Seattle|Searches Seattle visitors run next)/,
    );
    // The §5.5 example names Tacoma/Bellevue/Everett, but those
    // places have no city page in the current catalogue — the real
    // nearest pages (Marysville, Vancouver WA at measurement time)
    // are what the block must carry, with distance facts.
    expect(html).toMatch(/Live cameras in [A-Z]/);
    expect(html).toMatch(
      /\d+ km (north|south|east|west|north-east|north-west|south-east|south-west) of Seattle/,
    );
  }, 600_000);

  it("the Japan country page carries the C8 traffic hand-off and a related-searches block", async () => {
    const Page = (await import("@/app/cameras/countries/[country]/page")).default;
    const el = await Page({ params: Promise.resolve({ country: "japan" }) });
    const html = renderToString(el as React.ReactElement);
    expect(html).toContain('href="/japan-traffic-cameras"');
    expect(html).toMatch(/Japan(&#x27;|')s road and river cameras/);
    expect(html).toMatch(
      /(Keep exploring Japan|More ways to look at Japan|Searches Japan visitors run next)/,
    );
  }, 600_000);

  it("a thin country page keeps the block dark (min-3 gate) but keeps its up-links", async () => {
    const Page = (await import("@/app/cameras/countries/[country]/page")).default;
    const el = await Page({ params: Promise.resolve({ country: "bermuda" }) });
    const html = renderToString(el as React.ReactElement);
    expect(html).not.toMatch(
      /(Keep exploring Bermuda|More ways to look at Bermuda|Searches Bermuda visitors run next)/,
    );
    expect(html).toContain('href="/cameras/countries"');
    expect(html).toContain('href="/north-america-webcams"');
  }, 600_000);
});

describe("C5/C6 deferred follow-ups — rendered pins", () => {
  it("Calgary renders place facts, the quadrant split and named viewpoints", async () => {
    const Page = (await import("@/app/city-webcams/[city]/page")).default;
    const el = await Page({ params: Promise.resolve({ city: "calgary" }) });
    const html = renderToString(el as React.ReactElement);
    // §4.1.3 facts: the grid's centre + widest span, from its records.
    expect(html).toContain("at their widest");
    // §4.1.5: Calgary's names close with the address quadrant, and the
    // split is systematic there (192 of 233 records) — the one
    // generated city whose district signal clears the gate.
    expect(html).toContain("cameras by quadrant");
    expect(html).toContain("South-west (SW)");
    // §4.1.4: landmark-named cameras beyond the featured list.
    expect(html).toContain("Named viewpoints in");
  }, 600_000);

  it("Utah renders the pass note, and its FAQ schema carries the Current Status rows", async () => {
    const Page = (await import("@/app/us-traffic-cameras/[state]/page")).default;
    const el = await Page({ params: Promise.resolve({ state: "utah" }) });
    const html = renderToString(el as React.ReactElement);
    // §4.2.3: UDOT names its passes; the note quotes them verbatim.
    expect(html).toContain("Mountain passes");
    expect(html).toContain("Bald Mountain Pass");
    // Piece 4: the FAQPage schema now includes the visible Current
    // Status rows (before this chunk it carried the page FAQs only).
    expect(html).toContain('"name":"Is it snowing in Utah right now?"');
    expect(html).toContain('"name":"How bad is traffic in Utah right now?"');
  }, 600_000);

  it("the Japan country FAQ schema carries the Current Status rows", async () => {
    const Page = (await import("@/app/cameras/countries/[country]/page")).default;
    const el = await Page({ params: Promise.resolve({ country: "japan" }) });
    const html = renderToString(el as React.ReactElement);
    expect(html).toContain("Is it snowing in Japan right now?");
    expect(html).toContain("Can I check traffic in Japan right now?");
  }, 600_000);
});

describe("static wiring pins", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("both place templates run the C9 builder and feed it the page's existing anchors", () => {
    const city = read("src/app/city-webcams/[city]/page.tsx");
    expect(city).toContain("buildRelatedSearches");
    expect(city).toContain("relatedLinks.map((l) => l.label)");
    const country = read("src/app/cameras/countries/[country]/page.tsx");
    expect(country).toContain("buildRelatedSearches");
    expect(country).toContain("trafficLink.anchor");
  });

  it("the compare template keeps the C7 hand-off for every dual-family slug", () => {
    const src = read("src/app/compare/[slug]/page.tsx");
    for (const slug of [
      "windy",
      "skylinewebcams",
      "flightradar24",
      "google-earth",
      "dataminr",
      "liveuamap",
      "world-monitor",
      "zoom-earth",
      "earthcam",
    ]) {
      expect(src, slug).toContain(slug);
    }
    expect(src).toContain("ALTERNATIVES_HANDOFF");
  });

  it("/alternatives is a page, not a redirect to /compare", () => {
    const cfg = read("next.config.ts");
    expect(cfg).toContain("source: '/alternatives/earthcam'");
    expect(cfg).toContain("destination: '/earthcam-alternative'");
    expect(cfg).not.toMatch(/source:\s*'\/alternatives',\s*\n\s*destination:\s*'\/compare'/);
  });

  it("state and country templates merge Current Status rows into the FAQ schema", () => {
    const state = read("src/app/us-traffic-cameras/[state]/page.tsx");
    expect(state).toContain("statusFaqs(placeMerged.merged, statusRows)");
    expect(state).toContain("loadStatePassBorder");
    const country = read("src/app/cameras/countries/[country]/page.tsx");
    expect(country).toContain("statusFaqs(placeMerged.merged, statusRows)");
    const city = read("src/app/city-webcams/[city]/page.tsx");
    expect(city).toContain("loadCityPlaceDetails");
  });
});
