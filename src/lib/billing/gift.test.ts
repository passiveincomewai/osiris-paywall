// Gift subscription core-logic pins (src/lib/billing/gift.ts):
//   - only the nine grid plans are giftable;
//   - redemption codes are long, URL-safe bearer tokens;
//   - giftPeriodFromSubscription reads the v18 item period and
//     refuses missing/inverted periods;
//   - redeemDecision's refusal table: unknown / already redeemed /
//     expired / unpaid / wrong email / already subscribed — and the
//     one grant path. Double redemption is refused by the
//     already_redeemed row of this table AND by the conditional claim
//     in the redeem route (route test pins the pair end to end).
// Run: npx vitest run src/lib/billing/gift.test.ts
import { describe, it, expect } from "vitest";
import {
  GIFT_PLAN_KEYS,
  isGiftPlanKey,
  generateGiftCode,
  giftPeriodFromSubscription,
  redeemDecision,
  type RedeemGiftView,
} from "./gift";

const NOW = new Date("2026-10-31T12:00:00Z");
const FUTURE = new Date("2026-11-30T12:00:00Z");
const PAST = new Date("2026-10-01T12:00:00Z");

function paidGift(overrides: Partial<RedeemGiftView> = {}): RedeemGiftView {
  return {
    status: "paid",
    recipientEmail: "friend@example.com",
    periodEnd: FUTURE,
    ...overrides,
  };
}

describe("isGiftPlanKey", () => {
  it("accepts exactly the nine grid plans", () => {
    expect(GIFT_PLAN_KEYS).toHaveLength(9);
    for (const key of GIFT_PLAN_KEYS) expect(isGiftPlanKey(key)).toBe(true);
  });

  it("rejects standalone products and junk", () => {
    for (const bad of ["enterprise", "ambient", "ski", "pro", "weekly", "", null, undefined, 42]) {
      expect(isGiftPlanKey(bad)).toBe(false);
    }
  });
});

describe("generateGiftCode", () => {
  it("produces long URL-safe codes that differ per call", () => {
    const a = generateGiftCode();
    const b = generateGiftCode();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe("giftPeriodFromSubscription", () => {
  it("converts the item period from seconds to Dates", () => {
    const start = Math.floor(NOW.getTime() / 1000);
    const end = Math.floor(FUTURE.getTime() / 1000);
    const period = giftPeriodFromSubscription({
      items: { data: [{ current_period_start: start, current_period_end: end }] },
    });
    expect(period?.start.getTime()).toBe(start * 1000);
    expect(period?.end.getTime()).toBe(end * 1000);
  });

  it("refuses missing or inverted periods", () => {
    expect(giftPeriodFromSubscription({ items: { data: [] } })).toBeNull();
    expect(giftPeriodFromSubscription({ items: { data: [{}] } })).toBeNull();
    expect(giftPeriodFromSubscription({})).toBeNull();
    const start = Math.floor(FUTURE.getTime() / 1000);
    const end = Math.floor(NOW.getTime() / 1000);
    expect(
      giftPeriodFromSubscription({
        items: { data: [{ current_period_start: start, current_period_end: end }] },
      }),
    ).toBeNull();
  });
});

describe("redeemDecision", () => {
  const base = { userEmail: "friend@example.com", existingSub: null, now: NOW };

  it("grants a paid, in-term gift to the recipient with no live sub", () => {
    expect(redeemDecision({ ...base, gift: paidGift() })).toEqual({ kind: "grant" });
  });

  it("matches the recipient email case-insensitively", () => {
    expect(
      redeemDecision({ ...base, userEmail: " Friend@Example.COM ", gift: paidGift() }),
    ).toEqual({ kind: "grant" });
  });

  it("refuses an unknown code with 404", () => {
    const d = redeemDecision({ ...base, gift: null });
    expect(d).toMatchObject({ kind: "refuse", reason: "not_found", httpStatus: 404 });
  });

  it("refuses a pending (unpaid) gift with 400", () => {
    const d = redeemDecision({ ...base, gift: paidGift({ status: "pending" }) });
    expect(d).toMatchObject({ kind: "refuse", reason: "unpaid", httpStatus: 400 });
  });

  it("refuses a second redemption with 409 — double redemption is impossible", () => {
    const d = redeemDecision({ ...base, gift: paidGift({ status: "redeemed" }) });
    expect(d).toMatchObject({ kind: "refuse", reason: "already_redeemed", httpStatus: 409 });
  });

  it("refuses an expired gift, by status and by lapsed period, with 410", () => {
    expect(redeemDecision({ ...base, gift: paidGift({ status: "expired" }) })).toMatchObject({
      kind: "refuse",
      reason: "expired",
      httpStatus: 410,
    });
    expect(redeemDecision({ ...base, gift: paidGift({ periodEnd: PAST }) })).toMatchObject({
      kind: "refuse",
      reason: "expired",
      httpStatus: 410,
    });
    expect(redeemDecision({ ...base, gift: paidGift({ periodEnd: null }) })).toMatchObject({
      kind: "refuse",
      reason: "expired",
    });
  });

  it("refuses a signed-in user who is not the recipient, with 403", () => {
    const d = redeemDecision({ ...base, userEmail: "someoneelse@example.com", gift: paidGift() });
    expect(d).toMatchObject({ kind: "refuse", reason: "email_mismatch", httpStatus: 403 });
  });

  it("refuses while the recipient holds live access — the gift is NOT consumed", () => {
    for (const status of ["active", "trialing", "past_due"]) {
      const d = redeemDecision({
        ...base,
        gift: paidGift(),
        existingSub: { status, currentPeriodEnd: FUTURE },
      });
      expect(d).toMatchObject({ kind: "refuse", reason: "already_subscribed", httpStatus: 409 });
    }
  });

  it("grants over a lapsed or cancelled row (it is replaced at grant time)", () => {
    expect(
      redeemDecision({
        ...base,
        gift: paidGift(),
        existingSub: { status: "active", currentPeriodEnd: PAST },
      }),
    ).toEqual({ kind: "grant" });
    expect(
      redeemDecision({
        ...base,
        gift: paidGift(),
        existingSub: { status: "canceled", currentPeriodEnd: FUTURE },
      }),
    ).toEqual({ kind: "grant" });
  });

  it("checks redemption state before email match (the code is the bearer secret)", () => {
    const d = redeemDecision({
      ...base,
      userEmail: "someoneelse@example.com",
      gift: paidGift({ status: "redeemed" }),
    });
    expect(d).toMatchObject({ kind: "refuse", reason: "already_redeemed" });
  });
});
