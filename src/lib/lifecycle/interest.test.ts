// Interest-inference tests: the honesty order is what's being pinned —
// a checkout attempt may name a plan; a pricing page view may NOT (it
// records no plan), so view-only users must come out plan-less, and a
// pricing bounce must not count as engagement.
import { describe, it, expect } from "vitest";
import { inferPlanInterest, normalizePlan } from "./interest";

const NOW = new Date(Date.UTC(2026, 9, 22, 18, 0, 0));
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);

describe("normalizePlan", () => {
  it("maps the stored spellings, including VIP → annual", () => {
    expect(normalizePlan("monthly")).toBe("monthly");
    expect(normalizePlan(" Weekly ")).toBe("weekly");
    expect(normalizePlan("vip")).toBe("annual");
    expect(normalizePlan("yearly")).toBe("annual");
    expect(normalizePlan("enterprise")).toBeNull();
    expect(normalizePlan(null)).toBeNull();
    expect(normalizePlan("gold-tier")).toBeNull();
  });
});

describe("inferPlanInterest", () => {
  it("names the plan from the most recent recognizable attempt", () => {
    const r = inferPlanInterest({
      attempts: [
        { plan: "weekly", createdAt: hoursAgo(30) },
        { plan: "annual", createdAt: hoursAgo(5) },
        { plan: null, createdAt: hoursAgo(1) },
      ],
      pricingViews: [],
    });
    expect(r.plan).toBe("annual");
    expect(r.basis).toBe("checkout_attempt");
  });

  it("never invents a plan from page views alone", () => {
    const r = inferPlanInterest({
      attempts: [],
      pricingViews: [
        { durationSec: 120, createdAt: hoursAgo(2) },
        { durationSec: 90, createdAt: hoursAgo(3) },
      ],
    });
    expect(r.plan).toBeNull();
    expect(r.basis).toBe("pricing_engagement");
    expect(r.pricingEngaged).toBe(true);
  });

  it("a single short pricing view is a bounce, not engagement", () => {
    const r = inferPlanInterest({
      attempts: [],
      pricingViews: [{ durationSec: 3, createdAt: hoursAgo(1) }],
    });
    expect(r.pricingEngaged).toBe(false);
    expect(r.basis).toBe("none");
  });

  it("engagement clears via repeat views, one long view, or total dwell", () => {
    const twoViews = inferPlanInterest({
      attempts: [],
      pricingViews: [
        { durationSec: 1, createdAt: hoursAgo(1) },
        { durationSec: 1, createdAt: hoursAgo(2) },
      ],
    });
    expect(twoViews.pricingEngaged).toBe(true);
    const oneLong = inferPlanInterest({
      attempts: [],
      pricingViews: [{ durationSec: 15, createdAt: hoursAgo(1) }],
    });
    expect(oneLong.pricingEngaged).toBe(true);
    const total = inferPlanInterest({
      attempts: [],
      pricingViews: [{ durationSec: 30, createdAt: hoursAgo(1) }],
    });
    expect(total.pricingEngaged).toBe(true);
  });

  it("reports the latest pricing view and total dwell", () => {
    const r = inferPlanInterest({
      attempts: [],
      pricingViews: [
        { durationSec: 10, createdAt: hoursAgo(9) },
        { durationSec: null, createdAt: hoursAgo(4) },
      ],
    });
    expect(r.lastPricingViewAt).toEqual(hoursAgo(4));
    expect(r.pricingSeconds).toBe(10);
  });
});
