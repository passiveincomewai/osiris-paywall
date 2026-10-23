// Config tests: the discount offer is replaceable configuration, not a
// hardcoded code — what matters is that an expired offer disappears
// (emails then render with NO code rather than advertising a dead one),
// env overrides actually take effect, and the owner/test exclusion list
// is exact and case-insensitive.
import { describe, it, expect } from "vitest";
import { currentDiscountOffer, isExcludedEmail } from "./config";

const NOW = new Date(Date.UTC(2026, 9, 22, 18, 0, 0)); // Oct 22 2026

describe("currentDiscountOffer", () => {
  it("defaults to the live EARLY50 promotion before its expiry", () => {
    const offer = currentDiscountOffer({}, NOW);
    expect(offer?.code).toBe("EARLY50");
    expect(offer?.label).toBe("50% off your first payment");
    expect(offer?.expiresAt?.toISOString()).toBe("2026-10-26T05:59:00.000Z");
  });

  it("returns null once the configured offer has expired", () => {
    const after = new Date(Date.UTC(2026, 9, 27, 0, 0, 0));
    expect(currentDiscountOffer({}, after)).toBeNull();
  });

  it("honors env overrides, including an explicit no-expiry campaign", () => {
    const offer = currentDiscountOffer(
      {
        LIFECYCLE_DISCOUNT_CODE: "HALLOWEEN40",
        LIFECYCLE_DISCOUNT_LABEL: "40% off your first payment",
        LIFECYCLE_DISCOUNT_EXPIRES_AT: "",
      },
      NOW,
    );
    expect(offer).toEqual({ code: "HALLOWEEN40", label: "40% off your first payment", expiresAt: null });
  });

  it("an empty code disables the offer entirely", () => {
    expect(currentDiscountOffer({ LIFECYCLE_DISCOUNT_CODE: "  " }, NOW)).toBeNull();
  });
});

describe("isExcludedEmail", () => {
  it("matches the owner/test inboxes case-insensitively, with padding", () => {
    for (const email of [
      "jamesonlythgoe@gmail.com",
      "PASSIVEINCOMEWAI@GMAIL.COM",
      " xfueltests@gmail.com ",
      "xfuelmarketing@gmail.com",
      "theboodirectory@gmail.com",
    ]) {
      expect(isExcludedEmail(email)).toBe(true);
    }
  });
  it("does not exclude ordinary users, but fails closed on empty values", () => {
    expect(isExcludedEmail("someone@example.com")).toBe(false);
    expect(isExcludedEmail(null)).toBe(true);
    expect(isExcludedEmail(undefined)).toBe(true);
    expect(isExcludedEmail("")).toBe(true);
  });
});
