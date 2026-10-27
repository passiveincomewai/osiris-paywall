import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import countriesIndex from "@/data/camera-countries.json";
import { COUNTRY_REGION, countryFacts } from "@/lib/country-page-content";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Render check for the country camera pages: the thin end of the family
 * (countries with a handful of cameras and no hand-written content) must
 * still render a full page of genuine, data-derived text — the same strip
 * method as the live crawl that found them at 721–796 visible words.
 */

function words(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ");
  return text.split(/\s+/).filter(Boolean).length;
}

const THIN = [
  "iran",
  "morocco",
  "vatican-city",
  "yemen",
  "denmark",
  "egypt",
  "singapore",
  "india",
  "ukraine",
  "luxembourg",
];

describe("country pages render full content for thin countries", () => {
  it("every sampled thin country clears the depth floor", async () => {
    const Page = (await import("@/app/(en)/cameras/countries/[country]/page")).default;
    const counts: Record<string, number> = {};
    const htmls: Record<string, string> = {};
    for (const slug of THIN) {
      const el = await Page({ params: Promise.resolve({ country: slug }) });
      const html = renderToString(el as React.ReactElement);
      htmls[slug] = html;
      counts[slug] = words(html);
    }
    // eslint-disable-next-line no-console
    console.log("country page render words:", counts);
    for (const slug of THIN) {
      // The new data-derived sections must be present by name.
      expect(htmls[slug], slug).toContain("camera network in detail");
      expect(htmls[slug], slug).toContain("What people watch in");
      expect(htmls[slug], slug).toContain("More live cameras in");
    }
    for (const slug of THIN) {
      expect(counts[slug], slug).toBeGreaterThanOrEqual(1050);
    }
  }, 120000);

  it("every country in the index has a region and derivable facts", () => {
    const countries = countriesIndex.countries;
    for (const c of countries) {
      expect(COUNTRY_REGION[c.slug], c.slug).toBeDefined();
      const records = JSON.parse(
        readFileSync(join(process.cwd(), "src", "data", "countries", `${c.slug}.json`), "utf8"),
      );
      const facts = countryFacts(c, records, countries);
      // Facts must reconcile with the records they were derived from.
      expect(facts.sources.reduce((n, s) => n + s.count, 0)).toBeLessThanOrEqual(records.length);
      expect(facts.stills + facts.streams).toBeLessThanOrEqual(records.length);
      expect(facts.rank).toBeGreaterThanOrEqual(1);
      expect(facts.rank).toBeLessThanOrEqual(countries.length);
    }
  });
});
