import { describe, it, expect } from "vitest";
import { buildPricingSoftwareJsonLd } from "./pricing-schema";
import { enPricing } from "@/i18n/dictionaries/en/pricing";

/**
 * Regression pin for the payload154 dark-launch leak: the exhaustive
 * CHECKOUT_PLAN_SUMMARIES record carries a "ski" (Powder Pass) entry so
 * /checkout can describe the plan once lit, but while POWDER_PASS_ENABLED
 * is off the plan is not on sale and must never appear in the /pricing
 * page's JSON-LD offers. Live standalone plans (Ambient) stay.
 */
const offerNames = (env: Record<string, string | undefined>) =>
  buildPricingSoftwareJsonLd(enPricing, "en", env).offers.map((o) => o.name);

describe("buildPricingSoftwareJsonLd — dark plans stay out of the offers", () => {
  it("excludes Powder Pass while POWDER_PASS_ENABLED is unset", () => {
    const names = offerNames({});
    expect(names).not.toContain("Powder Pass");
    // Free + weekly/monthly/annual/enterprise/ambient summaries.
    expect(names).toHaveLength(6);
  });

  it("excludes Powder Pass for non-affirmative flag values", () => {
    for (const v of ["0", "false", "off", ""]) {
      expect(offerNames({ POWDER_PASS_ENABLED: v })).not.toContain("Powder Pass");
    }
  });

  it("keeps the live plans in the offers while Powder Pass is dark", () => {
    const names = offerNames({});
    expect(names).toContain("Free");
    expect(names).toContain("Enterprise");
    expect(names).toContain("WorldEye Ambient");
  });

  it("includes Powder Pass once the flag is on", () => {
    const ld = buildPricingSoftwareJsonLd(enPricing, "en", {
      POWDER_PASS_ENABLED: "1",
    });
    const powder = ld.offers.find((o) => o.name === "Powder Pass");
    expect(powder).toBeDefined();
    expect(powder?.price).toBe("4.99");
    expect(powder?.priceCurrency).toBe("USD");
    expect(ld.offers).toHaveLength(7);
  });
});
