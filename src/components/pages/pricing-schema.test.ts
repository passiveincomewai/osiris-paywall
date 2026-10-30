import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildPricingSoftwareJsonLd } from "./pricing-schema";
import { enPricing } from "@/i18n/dictionaries/en/pricing";

/**
 * Regression pin, updated for the owner's 2026-10-29 ruling: the
 * exhaustive checkout summaries carry a "ski" (Powder Pass) entry so
 * /checkout can describe the plan, but Powder Pass is sold ONLY from
 * the ski pages — the /pricing page carries no ski offering at all,
 * so its JSON-LD never includes the ski offer, in any flag state.
 * Live standalone plans (Ambient) stay. Originally a payload154
 * dark-launch leak pin (flag-off exclusion); the ruling makes the
 * exclusion unconditional.
 *
 * Phase C update (Pricing Redesign, 2026-10-30): the offers are the
 * 3×3 grid (Lite / Pro / Ultra × weekly / monthly / annual) plus
 * Enterprise and Ambient, and each grid offer is CONFIG-GATED — it is
 * advertised only when its Stripe price id is configured
 * (resolvePlans sellable), so the structured data never offers a
 * plan checkout would refuse. These tests stub the price env to pin
 * both states.
 */
const GRID_PRICE_ENV = [
  "STRIPE_LITE_WEEKLY_PRICE_ID",
  "STRIPE_LITE_MONTHLY_PRICE_ID",
  "STRIPE_LITE_ANNUAL_PRICE_ID",
  "STRIPE_WEEKLY_PRICE_ID",
  "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_ANNUAL_PRICE_ID",
  "STRIPE_ULTRA_WEEKLY_PRICE_ID",
  "STRIPE_ULTRA_MONTHLY_PRICE_ID",
  "STRIPE_ULTRA_ANNUAL_PRICE_ID",
  "STRIPE_ENTERPRISE_PRICE_ID",
] as const;

const offerNames = () =>
  buildPricingSoftwareJsonLd(enPricing, "en").offers.map((o) => o.name);

describe("buildPricingSoftwareJsonLd — Powder Pass stays out of the offers", () => {
  beforeEach(() => {
    for (const key of GRID_PRICE_ENV) vi.stubEnv(key, "price_test_stub");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("excludes Powder Pass from the pricing offers", () => {
    const names = offerNames();
    expect(names).not.toContain("Powder Pass");
  });

  it("offers the full 3×3 grid plus Enterprise and Ambient when configured", () => {
    const names = offerNames();
    expect(names).toEqual([
      "Free",
      "Lite Weekly",
      "Lite Monthly",
      "Lite Annual",
      "Weekly",
      "Monthly",
      "VIP Pro",
      "Ultra Weekly",
      "Ultra Monthly",
      "Ultra Annual",
      "Enterprise",
      "WorldEye Ambient",
    ]);
  });

  it("keeps the live plans in the offers", () => {
    const names = offerNames();
    expect(names).toContain("Free");
    expect(names).toContain("Enterprise");
    expect(names).toContain("WorldEye Ambient");
  });

  it("fails safe when the prices are not configured", () => {
    vi.unstubAllEnvs();
    const names = offerNames();
    expect(names).not.toContain("Powder Pass");
    // Only Ambient remains: it is the one plan with a code-level
    // price fallback. No grid or Enterprise offer is advertised that
    // checkout would refuse.
    expect(names).toEqual(["Free", "WorldEye Ambient"]);
  });
});
