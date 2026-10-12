// Tiered affiliate discount codes — unit tests for the pure parts:
// the ladder resolution (rank % + creator floor + max), code-string
// building/sanitization, and the sync decision (stored vs desired).
// DB/Stripe-backed paths (ensureDiscountCode, coupon reuse) are exercised
// against staging with a test-mode key; these tests pin the rules that
// must never regress: creators never drop below 20%, codes are always
// Stripe-safe, and a stored code only counts as "synced" when Stripe has
// confirmed a promotion code for exactly that code+pct.
import { describe, it, expect } from "vitest";
import { RANKS, CREATOR_DISCOUNT_PCT, discountPercentFor, buildDiscountCode, sanitizeCodeSlug } from "./ranks";
import { desiredDiscountFor, discountSyncDecision } from "./discount";

describe("discount ladder (rank → % off first payment)", () => {
  it("carries the spec percent on every rank, ascending", () => {
    expect(RANKS.map((r) => r.discountPct)).toEqual([5, 10, 15, 20, 25, 30]);
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].discountPct).toBeGreaterThan(RANKS[i - 1].discountPct);
    }
  });

  it("resolves the rank percent from XP at the spec thresholds", () => {
    const at = (xp: number) => discountPercentFor({ xp, creatorApproved: false });
    expect(at(0)).toBe(5);
    expect(at(999)).toBe(5);
    expect(at(1000)).toBe(10);
    expect(at(3000)).toBe(15);
    expect(at(7500)).toBe(20);
    expect(at(15000)).toBe(25);
    expect(at(29999)).toBe(25);
    expect(at(30000)).toBe(30);
    expect(at(999999)).toBe(30);
  });
});

describe("creator floor (approved creators get at least 20%)", () => {
  it("exports the floor constant", () => {
    expect(CREATOR_DISCOUNT_PCT).toBe(20);
  });

  it("lifts low ranks to 20%", () => {
    expect(discountPercentFor({ xp: 0, creatorApproved: true })).toBe(20);
    expect(discountPercentFor({ xp: 1000, creatorApproved: true })).toBe(20);
    expect(discountPercentFor({ xp: 3000, creatorApproved: true })).toBe(20);
  });

  it("never lowers a higher rank (max wins, not override)", () => {
    expect(discountPercentFor({ xp: 7500, creatorApproved: true })).toBe(20);
    expect(discountPercentFor({ xp: 15000, creatorApproved: true })).toBe(25);
    expect(discountPercentFor({ xp: 30000, creatorApproved: true })).toBe(30);
  });

  it("does not apply without an approved application", () => {
    expect(discountPercentFor({ xp: 0, creatorApproved: false })).toBe(5);
  });
});

describe("code-string building ({SLUG}{PCT})", () => {
  it("builds the spec example", () => {
    expect(buildDiscountCode("jameson", 20)).toBe("JAMESON20");
  });

  it("uppercases and appends the percent", () => {
    expect(buildDiscountCode("SkyWatcher", 5)).toBe("SKYWATCHER5");
    expect(buildDiscountCode("abc123", 30)).toBe("ABC12330");
  });

  it("strips Stripe-unsafe characters (dashes, underscores, spaces, dots)", () => {
    expect(buildDiscountCode("my-code_x.1", 10)).toBe("MYCODEX110");
    expect(buildDiscountCode("a b-c", 15)).toBe("ABC15");
  });

  it("sanitizeCodeSlug keeps only [A-Z0-9]", () => {
    expect(sanitizeCodeSlug("héllo-wörld!")).toBe("HLLOWRLD");
    expect(sanitizeCodeSlug("")).toBe("");
  });

  it("falls back to the brand slug when nothing survives sanitization", () => {
    expect(buildDiscountCode("---", 25)).toBe("WORLDEYE25");
  });
});

describe("desiredDiscountFor (slug + percent together)", () => {
  const base = { xp: 0, customCode: null as string | null, referralCode: "refcode9" };

  it("uses the referral code when no custom code is set", () => {
    expect(desiredDiscountFor(base, false)).toEqual({ code: "REFCODE95", pct: 5 });
  });

  it("prefers the custom code", () => {
    expect(desiredDiscountFor({ ...base, customCode: "my-brand" }, false)).toEqual({
      code: "MYBRAND5",
      pct: 5,
    });
  });

  it("applies the creator floor to the code string too", () => {
    expect(desiredDiscountFor(base, true)).toEqual({ code: "REFCODE920", pct: 20 });
  });

  it("rotates the code when the rank rises", () => {
    expect(desiredDiscountFor({ ...base, xp: 15000 }, false)).toEqual({
      code: "REFCODE925",
      pct: 25,
    });
  });
});

describe("discountSyncDecision (stored vs desired)", () => {
  const desired = { code: "JAMESON20", pct: 20 };

  it("is synced only when code+pct match AND Stripe confirmed a promo id", () => {
    expect(
      discountSyncDecision(
        { discountCode: "JAMESON20", discountPct: 20, stripePromotionCodeId: "promo_123" },
        desired,
        true,
      ),
    ).toBe("synced");
  });

  it("needs sync when the stored code is for an old tier", () => {
    expect(
      discountSyncDecision(
        { discountCode: "JAMESON15", discountPct: 15, stripePromotionCodeId: "promo_123" },
        desired,
        true,
      ),
    ).toBe("needs_sync");
  });

  it("needs sync when nothing is stored yet", () => {
    expect(discountSyncDecision(null, desired, true)).toBe("needs_sync");
    expect(
      discountSyncDecision(
        { discountCode: null, discountPct: null, stripePromotionCodeId: null },
        desired,
        true,
      ),
    ).toBe("needs_sync");
  });

  it("needs sync when code+pct are stored but Stripe never confirmed", () => {
    expect(
      discountSyncDecision(
        { discountCode: "JAMESON20", discountPct: 20, stripePromotionCodeId: null },
        desired,
        true,
      ),
    ).toBe("needs_sync");
  });

  it("is pending_config without a Stripe key — even when stored matches", () => {
    expect(discountSyncDecision(null, desired, false)).toBe("pending_config");
    expect(
      discountSyncDecision(
        { discountCode: "JAMESON15", discountPct: 15, stripePromotionCodeId: "promo_123" },
        desired,
        false,
      ),
    ).toBe("pending_config");
  });

  it("still reports synced without a key when stored state is fully confirmed", () => {
    // A previously synced code stays valid if the key later disappears —
    // the promotion code lives in Stripe regardless of our config.
    expect(
      discountSyncDecision(
        { discountCode: "JAMESON20", discountPct: 20, stripePromotionCodeId: "promo_123" },
        desired,
        false,
      ),
    ).toBe("synced");
  });
});
