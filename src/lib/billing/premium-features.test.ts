/**
 * Mirror pins for PREMIUM_FEATURES: the globe panel's premium list must
 * be the pricing page's list, never a second hand-kept copy that can
 * drift. These tests read src/app/pricing/PricingClient.tsx (the same
 * source-reading pattern as src/app/conversion-cta.test.ts) and fail
 * if a card title changes, appears, or disappears on either side.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PREMIUM_FEATURES, premiumFeatureNames } from "./premium-features";

const pricingSrc = readFileSync(
  join(process.cwd(), "src", "app", "pricing", "PricingClient.tsx"),
  "utf8",
);

/** Card titles out of one `const X_FEATURES = [ ... ];` block. */
function cardTitles(blockName: string): string[] {
  const start = pricingSrc.indexOf(`const ${blockName} = [`);
  expect(start, `${blockName} block exists in PricingClient`).toBeGreaterThan(-1);
  const end = pricingSrc.indexOf("];", start);
  const block = pricingSrc.slice(start, end);
  return [...block.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
}

describe("PREMIUM_FEATURES mirrors the pricing page", () => {
  it("carries every Pro card title as a pro feature, word for word", () => {
    const byName = new Map(PREMIUM_FEATURES.map((f) => [f.name, f]));
    for (const title of cardTitles("PRO_FEATURES")) {
      expect(byName.get(title)?.tier, title).toBe("pro");
    }
  });

  it("carries every VIP Pro card title as a vip feature, word for word", () => {
    const byName = new Map(PREMIUM_FEATURES.map((f) => [f.name, f]));
    for (const title of cardTitles("VIP_FEATURES")) {
      expect(byName.get(title)?.tier, title).toBe("vip");
    }
  });

  it("adds only the compare matrix's card-less premium row on top of the cards", () => {
    const cardCount = cardTitles("PRO_FEATURES").length + cardTitles("VIP_FEATURES").length;
    // +1 is "Advanced search filters": premium in COMPARE_ROWS
    // (free: false, pro: true) with no PRO_FEATURES card.
    expect(PREMIUM_FEATURES.length).toBe(cardCount + 1);
    const extra = PREMIUM_FEATURES.filter(
      (f) => ![...cardTitles("PRO_FEATURES"), ...cardTitles("VIP_FEATURES")].includes(f.name),
    );
    expect(extra).toEqual([
      expect.objectContaining({ name: "Advanced search filters", tier: "pro" }),
    ]);
    expect(pricingSrc).toContain('feature: "Advanced search filters", free: false, pro: true');
  });

  it("names nothing the pricing page doesn't sell", () => {
    for (const f of PREMIUM_FEATURES) {
      expect(pricingSrc, f.name).toContain(f.name);
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
