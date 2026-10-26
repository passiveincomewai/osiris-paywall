// Past-due banner visibility — pure logic pins.
// The contract: only a past_due subscription can show the banner, and a
// dismissal hides it for THAT invoice token only — a new failed invoice
// (different id) or the generic form (different token) shows it again.
// Run: npx vitest run src/lib/billing/past-due-banner.test.ts
import { describe, it, expect } from "vitest";
import {
  PAST_DUE_BANNER_STORAGE_KEY,
  pastDueBannerToken,
  shouldShowPastDueBanner,
} from "./past-due-banner";

describe("pastDueBannerToken", () => {
  it("uses the invoice id, falling back to 'none' for the generic form", () => {
    expect(pastDueBannerToken("in_123")).toBe("in_123");
    expect(pastDueBannerToken(null)).toBe("none");
    expect(pastDueBannerToken(undefined)).toBe("none");
    expect(PAST_DUE_BANNER_STORAGE_KEY).toContain("past-due");
  });
});

describe("shouldShowPastDueBanner", () => {
  it("shows for a past_due user who never dismissed", () => {
    expect(
      shouldShowPastDueBanner({ status: "past_due", invoiceId: "in_1", dismissedToken: null }),
    ).toBe(true);
  });

  it("hides when the same invoice was dismissed", () => {
    expect(
      shouldShowPastDueBanner({ status: "past_due", invoiceId: "in_1", dismissedToken: "in_1" }),
    ).toBe(false);
  });

  it("shows again for a NEW invoice after an older one was dismissed", () => {
    expect(
      shouldShowPastDueBanner({ status: "past_due", invoiceId: "in_2", dismissedToken: "in_1" }),
    ).toBe(true);
  });

  it("generic form (no invoice) is hidden only by the 'none' dismissal", () => {
    expect(
      shouldShowPastDueBanner({ status: "past_due", invoiceId: null, dismissedToken: null }),
    ).toBe(true);
    expect(
      shouldShowPastDueBanner({ status: "past_due", invoiceId: null, dismissedToken: "none" }),
    ).toBe(false);
    expect(
      shouldShowPastDueBanner({ status: "past_due", invoiceId: null, dismissedToken: "in_1" }),
    ).toBe(true);
  });

  it("never shows for non-past-due statuses", () => {
    for (const status of ["active", "trialing", "canceled", "none", null, undefined]) {
      expect(
        shouldShowPastDueBanner({ status, invoiceId: "in_1", dismissedToken: null }),
      ).toBe(false);
    }
  });
});
