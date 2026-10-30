/**
 * Mirror pins for PREMIUM_FEATURES: the globe panel's premium list must
 * be the pricing page's list, never a second hand-kept copy that can
 * drift. Since the multilingual conversion (2026-10-26) the pricing
 * page's copy lives in the English pricing dictionary
 * (src/i18n/dictionaries/en/pricing.ts), so these tests read that file
 * (the same source-reading pattern as before) plus the client's
 * comparison checkmarks, and fail if a card title changes, appears, or
 * disappears on either side.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PREMIUM_FEATURES, premiumFeatureNames } from "./premium-features";

const dictSrc = readFileSync(
  join(process.cwd(), "src", "i18n", "dictionaries", "en", "pricing.ts"),
  "utf8",
);
const clientSrc = readFileSync(
  join(process.cwd(), "src", "app", "(en)", "pricing", "PricingClient.tsx"),
  "utf8",
);

/** Card titles out of one `blockName: [ ... ]` dictionary block. */
function cardTitles(blockName: string): string[] {
  const start = dictSrc.indexOf(`${blockName}: [`);
  expect(start, `${blockName} block exists in the pricing dictionary`).toBeGreaterThan(-1);
  const end = dictSrc.indexOf("\n  ],", start);
  const block = dictSrc.slice(start, end);
  return [...block.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
}

/** Comparison row labels, in dictionary order. */
function compareRows(): string[] {
  const block = dictSrc.slice(dictSrc.indexOf("rows: ["));
  return [...block.slice(0, block.indexOf("]")).matchAll(/"([^"]+)"/g)].map(
    (m) => m[1],
  );
}

/** Comparison checkmarks from the client, in dictionary row order.
 *  Columns are free / lite / pro / ultra since the Pricing Redesign
 *  Phase C grid (the vip column became ultra). */
function compareBooleans(): { free: boolean; lite: boolean; pro: boolean; ultra: boolean }[] {
  const block = clientSrc.slice(clientSrc.indexOf("const COMPARE_BOOLEANS"));
  return [
    ...block
      .slice(0, block.indexOf("];"))
      .matchAll(/\{ free: (true|false), lite: (true|false), pro: (true|false), ultra: (true|false) \}/g),
  ].map((m) => ({
    free: m[1] === "true",
    lite: m[2] === "true",
    pro: m[3] === "true",
    ultra: m[4] === "true",
  }));
}

describe("PREMIUM_FEATURES mirrors the pricing page", () => {
  it("carries every Pro card title as a pro feature, word for word", () => {
    const byName = new Map(PREMIUM_FEATURES.map((f) => [f.name, f]));
    for (const title of cardTitles("proFeatures")) {
      expect(byName.get(title)?.tier, title).toBe("pro");
    }
  });

  it("carries every VIP Pro card title as a vip feature, word for word", () => {
    const byName = new Map(PREMIUM_FEATURES.map((f) => [f.name, f]));
    for (const title of cardTitles("vipFeatures")) {
      expect(byName.get(title)?.tier, title).toBe("vip");
    }
  });

  it("adds only the compare matrix's card-less premium row on top of the cards", () => {
    const cardCount = cardTitles("proFeatures").length + cardTitles("vipFeatures").length;
    // +1 is "Advanced search filters": premium in the comparison rows
    // (free: false, pro: true) with no proFeatures card.
    expect(PREMIUM_FEATURES.length).toBe(cardCount + 1);
    const extra = PREMIUM_FEATURES.filter(
      (f) => ![...cardTitles("proFeatures"), ...cardTitles("vipFeatures")].includes(f.name),
    );
    expect(extra).toEqual([
      expect.objectContaining({ name: "Advanced search filters", tier: "pro" }),
    ]);
    const rows = compareRows();
    const i = rows.indexOf("Advanced search filters");
    expect(i).toBeGreaterThan(-1);
    // Search filters are a binary paid gate: every paid tier incl.
    // Lite carries them (lib/billing/plans.ts entitlementsFor).
    expect(compareBooleans()[i]).toEqual({ free: false, lite: true, pro: true, ultra: true });
  });

  it("names nothing the pricing page doesn't sell", () => {
    for (const f of PREMIUM_FEATURES) {
      expect(dictSrc, f.name).toContain(f.name);
    }
  });

  it("every feature has a tier and a non-empty blurb", () => {
    for (const f of PREMIUM_FEATURES) {
      expect(["pro", "vip"]).toContain(f.tier);
      expect(f.blurb.length).toBeGreaterThan(10);
    }
    expect(premiumFeatureNames("pro").length).toBeGreaterThan(0);
    expect(premiumFeatureNames("vip").length).toBeGreaterThan(0);
  });
});
