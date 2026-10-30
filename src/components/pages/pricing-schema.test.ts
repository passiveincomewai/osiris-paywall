import { describe, it, expect } from "vitest";
import { buildPricingSoftwareJsonLd } from "./pricing-schema";
import { enPricing } from "@/i18n/dictionaries/en/pricing";

/**
 * Regression pin, updated for the owner's 2026-10-29 ruling: the
 * exhaustive CHECKOUT_PLAN_SUMMARIES record carries a "ski" (Powder
 * Pass) entry so /checkout can describe the plan, but Powder Pass is
 * sold ONLY from the ski pages — the /pricing page carries no ski
 * offering at all, so its JSON-LD never includes the ski offer, in
 * any flag state (the builder no longer reads POWDER_PASS_ENABLED).
 * Live standalone plans (Ambient) stay. Originally a payload154
 * dark-launch leak pin (flag-off exclusion); the ruling makes the
 * exclusion unconditional.
 */
const offerNames = () =>
  buildPricingSoftwareJsonLd(enPricing, "en").offers.map((o) => o.name);

describe("buildPricingSoftwareJsonLd — Powder Pass stays out of the offers", () => {
  it("excludes Powder Pass from the pricing offers", () => {
    const names = offerNames();
    expect(names).not.toContain("Powder Pass");
    // Free + weekly/monthly/annual/enterprise/ambient summaries.
    expect(names).toHaveLength(6);
  });

  it("keeps the live plans in the offers", () => {
    const names = offerNames();
    expect(names).toContain("Free");
    expect(names).toContain("Enterprise");
    expect(names).toContain("WorldEye Ambient");
  });
});
