// Gift-flag pins: gift subscriptions are dark unless
// GIFT_SUBSCRIPTIONS_ENABLED carries an explicit affirmative value,
// and the sitemap list follows the same switch (the
// lib/developer/flag.test.ts contract, mirrored).
// Run: npx vitest run src/lib/billing/gift-flag.test.ts
import { describe, it, expect } from "vitest";
import { giftPublicPaths, giftSubscriptionsEnabled } from "./gift-flag";

describe("giftSubscriptionsEnabled", () => {
  it("is false when unset or empty", () => {
    expect(giftSubscriptionsEnabled({})).toBe(false);
    expect(giftSubscriptionsEnabled({ GIFT_SUBSCRIPTIONS_ENABLED: "" })).toBe(false);
    expect(giftSubscriptionsEnabled({ GIFT_SUBSCRIPTIONS_ENABLED: "  " })).toBe(false);
  });

  it("is false for non-affirmative values", () => {
    for (const v of ["0", "false", "off", "no", "enabled", "2"]) {
      expect(giftSubscriptionsEnabled({ GIFT_SUBSCRIPTIONS_ENABLED: v })).toBe(false);
    }
  });

  it("is true only for explicit affirmative values (case/space tolerant)", () => {
    for (const v of ["1", "true", "on", "yes", " TRUE ", "Yes"]) {
      expect(giftSubscriptionsEnabled({ GIFT_SUBSCRIPTIONS_ENABLED: v })).toBe(true);
    }
  });
});

describe("giftPublicPaths", () => {
  it("contributes nothing while dark", () => {
    expect(giftPublicPaths({})).toEqual([]);
    expect(giftPublicPaths({ GIFT_SUBSCRIPTIONS_ENABLED: "0" })).toEqual([]);
  });

  it("contributes only the purchase page while enabled", () => {
    expect(giftPublicPaths({ GIFT_SUBSCRIPTIONS_ENABLED: "1" })).toEqual(["/gift"]);
  });
});
