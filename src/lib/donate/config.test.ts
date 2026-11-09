import { describe, expect, it } from "vitest";
import {
  decideDonateToast,
  decideTimedDonatePrompt,
  donateAmountDetail,
  donateLookupKey,
  isDonateExcludedPath,
  parseDonateSessionRequest,
  validateDonateAmount,
  type DonatePromptContext,
} from "./config";

describe("donation amounts", () => {
  it("accepts whole dollars in range", () => {
    expect(validateDonateAmount(10)).toEqual({ ok: true, amount: 10 });
    expect(validateDonateAmount(1)).toEqual({ ok: true, amount: 1 });
    expect(validateDonateAmount(1000)).toEqual({ ok: true, amount: 1000 });
    expect(validateDonateAmount("25")).toEqual({ ok: true, amount: 25 });
  });
  it("rejects fractions, zero, negatives, and amounts over the cap", () => {
    expect(validateDonateAmount(10.5).ok).toBe(false);
    expect(validateDonateAmount(0).ok).toBe(false);
    expect(validateDonateAmount(-5).ok).toBe(false);
    expect(validateDonateAmount(1001).ok).toBe(false);
    expect(validateDonateAmount("abc").ok).toBe(false);
    expect(validateDonateAmount(undefined).ok).toBe(false);
  });
  it("resolves presets by lookup key and customs to null", () => {
    expect(donateLookupKey("once", 5)).toBe("donate_once_5");
    expect(donateLookupKey("once", 10)).toBe("donate_once_10");
    expect(donateLookupKey("monthly", 25)).toBe("donate_monthly_25");
    expect(donateLookupKey("monthly", 50)).toBe("donate_monthly_50");
    expect(donateLookupKey("once", 7)).toBeNull();
    expect(donateLookupKey("monthly", 100)).toBeNull();
  });
  it("parses a session request and defaults an unknown source", () => {
    expect(
      parseDonateSessionRequest({ amount: 10, frequency: "monthly", source: "blog" }),
    ).toEqual({ ok: true, amount: 10, frequency: "monthly", source: "blog" });
    expect(
      parseDonateSessionRequest({ amount: 10, frequency: "once", source: "nope" }),
    ).toEqual({ ok: true, amount: 10, frequency: "once", source: "inline_card" });
    expect(parseDonateSessionRequest({ amount: 10, frequency: "weekly" }).ok).toBe(false);
    expect(parseDonateSessionRequest(null).ok).toBe(false);
  });
  it("encodes analytics detail tokens", () => {
    expect(donateAmountDetail(10, "once")).toBe("10_once");
    expect(donateAmountDetail(25, "monthly")).toBe("25_monthly");
  });
});

function baseCtx(over: Partial<DonatePromptContext> = {}): DonatePromptContext {
  return {
    now: 1_000_000_000_000,
    identityState: "anonymous",
    accountSupporter: false,
    supporterStamp: null,
    dismissedAt: null,
    upgradeShownAt: null,
    anyDialogOpen: false,
    upgradePromoVisible: false,
    pathname: "/gods-eye-view",
    ...over,
  };
}

describe("timed prompt suppression", () => {
  it("shows for an eligible free visitor", () => {
    expect(decideTimedDonatePrompt(baseCtx()).show).toBe(true);
    expect(decideTimedDonatePrompt(baseCtx({ identityState: "free" })).show).toBe(true);
  });
  it("never shows to paid subscribers or supporters", () => {
    expect(decideTimedDonatePrompt(baseCtx({ identityState: "premium" })).show).toBe(false);
    expect(decideTimedDonatePrompt(baseCtx({ accountSupporter: true })).show).toBe(false);
    expect(
      decideTimedDonatePrompt(baseCtx({ supporterStamp: 1_000_000_000_000 - 1000 })).show,
    ).toBe(false);
    // A supporter stamp older than 12 months no longer suppresses.
    expect(
      decideTimedDonatePrompt(
        baseCtx({ supporterStamp: 1_000_000_000_000 - 366 * 24 * 3600 * 1000 }),
      ).show,
    ).toBe(true);
  });
  it("honours the 14-day dismissal window", () => {
    const now = 1_000_000_000_000;
    expect(
      decideTimedDonatePrompt(baseCtx({ dismissedAt: now - 13 * 24 * 3600 * 1000 })).show,
    ).toBe(false);
    expect(
      decideTimedDonatePrompt(baseCtx({ dismissedAt: now - 15 * 24 * 3600 * 1000 })).show,
    ).toBe(true);
  });
  it("honours the 5-minute upgrade mutual-exclusion contract", () => {
    const now = 1_000_000_000_000;
    expect(
      decideTimedDonatePrompt(baseCtx({ upgradeShownAt: now - 4 * 60 * 1000 })).show,
    ).toBe(false);
    expect(
      decideTimedDonatePrompt(baseCtx({ upgradeShownAt: now - 6 * 60 * 1000 })).show,
    ).toBe(true);
    expect(decideTimedDonatePrompt(baseCtx({ upgradePromoVisible: true })).show).toBe(false);
    expect(decideTimedDonatePrompt(baseCtx({ anyDialogOpen: true })).show).toBe(false);
  });
  it("never shows on excluded paths", () => {
    for (const p of ["/pricing", "/enterprise", "/checkout", "/account/billing", "/support"]) {
      expect(decideTimedDonatePrompt(baseCtx({ pathname: p })).show).toBe(false);
      expect(isDonateExcludedPath(p)).toBe(true);
    }
    expect(isDonateExcludedPath("/gods-eye-view")).toBe(false);
    expect(isDonateExcludedPath("/blog/some-post")).toBe(false);
  });
});

describe("globe toast gate", () => {
  it("requires 20 minutes of dwell and respects the 7-day cap", () => {
    const now = 1_000_000_000_000;
    expect(
      decideDonateToast({ ...baseCtx(), dwellMs: 19 * 60 * 1000, toastShownAt: null }).show,
    ).toBe(false);
    expect(
      decideDonateToast({ ...baseCtx(), dwellMs: 21 * 60 * 1000, toastShownAt: null }).show,
    ).toBe(true);
    expect(
      decideDonateToast({
        ...baseCtx(),
        dwellMs: 30 * 60 * 1000,
        toastShownAt: now - 6 * 24 * 3600 * 1000,
      }).show,
    ).toBe(false);
    expect(
      decideDonateToast({
        ...baseCtx(),
        dwellMs: 30 * 60 * 1000,
        toastShownAt: now - 8 * 24 * 3600 * 1000,
      }).show,
    ).toBe(true);
  });
});
