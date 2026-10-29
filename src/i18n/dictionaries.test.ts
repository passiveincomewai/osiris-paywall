/**
 * Dictionary completeness + factual-integrity tests (brief §11/§12).
 *
 * For every page × locale the manifest marks published:
 *  - a dictionary must exist (no silent English fallback),
 *  - its shape must match the English source dictionary,
 *  - the manifest's sourceHash must match the current English source
 *    (drift fails loudly here instead of rotting silently).
 *
 * Plus the glossary-locked facts for the Spanish tranche: camera
 * count, USD prices, trial lengths (weekly 3 days, monthly/annual
 * 10) and satellite imagery never sold as a Pro feature.
 */

import { describe, expect, it } from "vitest";
import { MANIFEST_ENTRIES, publishedLocalesFor } from "./manifest";
import { dictionarySourceHash } from "./source-hash";
import {
  PAGE_DICTIONARIES,
  englishDictionaryFor,
  getHomeCopy,
  getPricingCopy,
} from "./dictionaries/index";

const SEGMENT_TYPES = new Set(["text", "strong", "link", "accent"]);

function isSegmentArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (el) =>
        el !== null &&
        typeof el === "object" &&
        "t" in (el as Record<string, unknown>) &&
        SEGMENT_TYPES.has((el as { t: string }).t) &&
        "text" in (el as Record<string, unknown>)
    )
  );
}

/** Keys a locale dictionary may carry beyond the English source. */
const OPTIONAL_EXTRA_KEYS = new Set([
  "features", // pricing enterprise overrides (lib/enterprise/offer is en-only)
  "guaranteeLine",
  "supportLine",
  "voiceQuestions", // English trackers read the canonical dataset instead
]);

function compareShape(en: unknown, other: unknown, path: string): void {
  if (path.endsWith("voiceQuestions")) {
    // The English trackers read the canonical voice-question dataset,
    // so the en map is empty by design; a locale's map keys are
    // canonical entry ids and each value must be a full translation.
    expect(other, `${path}: locale value present`).toBeTruthy();
    for (const [id, v] of Object.entries(other as Record<string, unknown>)) {
      const entry = v as Record<string, unknown>;
      for (const field of ["question", "shortAnswer", "longAnswer"]) {
        expect(typeof entry[field], `${path}.${id}.${field}`).toBe("string");
      }
    }
    return;
  }
  if (Array.isArray(en) || Array.isArray(other)) {
    expect(Array.isArray(en), `${path}: en is array`).toBe(true);
    expect(Array.isArray(other), `${path}: locale is array`).toBe(true);
    if (isSegmentArray(en) || isSegmentArray(other)) {
      // RichText: segment composition legitimately differs per language
      // (word order); both sides must be valid, non-empty segment lists.
      expect(isSegmentArray(other), `${path}: valid segments`).toBe(true);
      return;
    }
    expect((other as unknown[]).length, `${path}: array length`).toBe(
      (en as unknown[]).length
    );
    (en as unknown[]).forEach((item, i) =>
      compareShape(item, (other as unknown[])[i], `${path}[${i}]`)
    );
    return;
  }
  if (en !== null && typeof en === "object") {
    expect(other, `${path}: locale value present`).not.toBeNull();
    expect(typeof other, `${path}: locale is object`).toBe("object");
    const enKeys = Object.keys(en as Record<string, unknown>);
    const otherKeys = Object.keys(other as Record<string, unknown>);
    for (const key of enKeys) {
      expect(otherKeys, `${path}.${key}: key present`).toContain(key);
      compareShape(
        (en as Record<string, unknown>)[key],
        (other as Record<string, unknown>)[key],
        `${path}.${key}`
      );
    }
    for (const key of otherKeys) {
      if (!enKeys.includes(key)) {
        expect(
          OPTIONAL_EXTRA_KEYS.has(key),
          `${path}.${key}: unexpected extra key`
        ).toBe(true);
      }
    }
    return;
  }
  expect(typeof other, `${path}: leaf type`).toBe(typeof en);
}

describe("manifest ↔ dictionary completeness", () => {
  it("publishes exactly the Spanish foundation tranche", () => {
    const published = MANIFEST_ENTRIES.filter((e) => e.status === "published");
    expect(published.map((e) => `${e.locale}:${e.slug}`).sort()).toEqual(
      [
        "es:",
        "es:faq",
        "es:live-flight-tracker",
        "es:live-webcams",
        "es:pricing",
        "es:ship-tracker",
      ].sort()
    );
  });

  for (const entry of MANIFEST_ENTRIES.filter((e) => e.status === "published")) {
    describe(`${entry.locale} /${entry.slug}`, () => {
      it("has a dictionary whose shape matches the English source", () => {
        const map = PAGE_DICTIONARIES[entry.slug];
        expect(map, `PAGE_DICTIONARIES[${entry.slug}]`).toBeDefined();
        const dict = map?.[entry.locale];
        expect(dict, `dictionary for ${entry.locale}`).toBeDefined();
        compareShape(englishDictionaryFor(entry.slug), dict, entry.slug || "(home)");
      });

      it("has a fresh sourceHash", () => {
        expect(entry.sourceHash).toBe(
          dictionarySourceHash(englishDictionaryFor(entry.slug))
        );
        // Publish date per entry: the 2026-10-26 tranche, except the
        // dictionaries re-synced after it — three by the 2026-10-27
        // rebase, ship-tracker on 2026-10-28 (cruise-ships section),
        // and live-flight-tracker + live-webcams on 2026-10-28 for the
        // SEO Phase 3 title/meta alignment (see manifest.ts).
        expect(entry.updatedAt).toBe(
          ["ship-tracker", "live-flight-tracker", "live-webcams"].includes(entry.slug)
            ? "2026-10-28"
            : ["", "pricing"].includes(entry.slug)
              ? "2026-10-27"
              : "2026-10-26"
        );
      });

      it("yields a reciprocal published-locale set", () => {
        expect(publishedLocalesFor(entry.slug)).toEqual(["en", "es"]);
      });
    });
  }
});

describe("glossary-locked facts (Spanish tranche)", () => {
  const esHome = getHomeCopy("es");
  const enHome = getHomeCopy("en");
  const esPricing = getPricingCopy("es");
  const enPricing = getPricingCopy("en");

  it("keeps the exact camera count in both number formats", () => {
    expect(enHome.cameras.h2).toContain("74,229");
    expect(esHome.cameras.h2).toContain("74.229");
  });

  it("keeps USD prices identical", () => {
    for (const dict of [enPricing, esPricing]) {
      expect(dict.plans.weekly.price).toBe("$7.99");
      expect(dict.plans.monthly.price).toBe("$13.99");
      expect(dict.plans.annual.price).toBe("$74.99");
      expect(dict.plans.enterprise.price).toBe("$999");
    }
  });

  it("keeps trial lengths: weekly 3 days, monthly & annual 10", () => {
    expect(enPricing.plans.weekly.trial).toBe("3 days free");
    expect(enPricing.plans.monthly.trial).toBe("10 days free");
    expect(enPricing.plans.annual.trial).toBe("10 days free");
    expect(esPricing.plans.weekly.trial).toBe("3 días gratis");
    expect(esPricing.plans.monthly.trial).toBe("10 días gratis");
    expect(esPricing.plans.annual.trial).toBe("10 días gratis");
    expect(esHome.plans.proTrialsLine).toContain("3 días");
    expect(esHome.plans.proTrialsLine).toContain("10 días");
    expect(enHome.plans.proTrialsLine).toContain("3 days");
    expect(enHome.plans.proTrialsLine).toContain("10 days");
  });

  it("never sells the free satellite view as a Pro feature", () => {
    for (const dict of [enHome, esHome]) {
      expect(dict.plans.proRows.join(" ")).not.toMatch(/satellite|satelital/i);
      expect(dict.faq.items.map((f) => f.a).join(" ")).not.toMatch(
        /adds[^.]*satellite|añade[^.]*satelital/i
      );
    }
  });
});
