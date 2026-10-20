import { describe, it, expect } from "vitest";
import { quoteSeatChange, cycleForPriceId } from "./seats";
import { DEFAULT_TIERS } from "./pricing";

const start = new Date("2026-10-01T00:00:00Z");
const end = new Date("2026-11-01T00:00:00Z");
const mid = new Date("2026-10-16T00:00:00Z"); // ~half the period remains

const base = {
  cycle: "monthly" as const,
  tiers: DEFAULT_TIERS.monthly,
  periodStart: start,
  periodEnd: end,
  now: mid,
  members: 1,
  pending: 0,
};

describe("quoteSeatChange", () => {
  it("increase: prorated estimate is the seat-cost delta × remaining fraction", () => {
    const q = quoteSeatChange({ ...base, currentSeats: 0, targetSeats: 5 });
    expect(q.kind).toBe("increase");
    expect(q.seatCostCents).toBe(5 * 1199);
    expect(q.totalCents).toBe(1399 + 5 * 1199);
    // 16 of 31 days remain → ~51.6% of the delta.
    expect(q.immediateDueEstimateCents).toBe(Math.round(5 * 1199 * (16 / 31)));
    expect(q.blockedReason).toBeNull();
    expect(q.effectiveDate).toBeNull();
  });

  it("decrease: scheduled at period end, nothing due now", () => {
    const q = quoteSeatChange({ ...base, currentSeats: 10, targetSeats: 5, members: 3, pending: 1 });
    expect(q.kind).toBe("decrease");
    expect(q.immediateDueEstimateCents).toBe(0);
    expect(q.effectiveDate).toBe(end.toISOString());
    expect(q.futureTotalCents).toBe(1399 + 5 * 1199);
    expect(q.blockedReason).toBeNull();
  });

  it("decrease below members + pending is blocked with a reason", () => {
    const q = quoteSeatChange({ ...base, currentSeats: 10, targetSeats: 2, members: 3, pending: 1 });
    expect(q.kind).toBe("decrease");
    expect(q.blockedReason).toMatch(/in use/);
  });

  it("trialing: seats ride the trial — nothing due, trial end surfaced", () => {
    const trialEnd = "2026-10-20T00:00:00.000Z";
    const q = quoteSeatChange({
      ...base, currentSeats: 0, targetSeats: 3, trialing: true, trialEndsAt: trialEnd,
    });
    expect(q.kind).toBe("increase");
    expect(q.immediateDueEstimateCents).toBe(0);
    expect(q.trialEndsAt).toBe(trialEnd);
  });

  it("no change → kind none", () => {
    const q = quoteSeatChange({ ...base, currentSeats: 4, targetSeats: 4 });
    expect(q.kind).toBe("none");
    expect(q.immediateDueEstimateCents).toBe(0);
  });
});

describe("cycleForPriceId", () => {
  const env = {
    STRIPE_WEEKLY_PRICE_ID: "w",
    STRIPE_MONTHLY_PRICE_ID: "m",
    STRIPE_ANNUAL_PRICE_ID: "a",
    STRIPE_ENTERPRISE_PRICE_ID: "e",
  };
  it("maps plan price ids to cycles (enterprise rides annual)", () => {
    expect(cycleForPriceId("w", env)).toBe("weekly");
    expect(cycleForPriceId("m", env)).toBe("monthly");
    expect(cycleForPriceId("a", env)).toBe("annual");
    expect(cycleForPriceId("e", env)).toBe("annual");
    expect(cycleForPriceId("unknown", env)).toBe("monthly");
    expect(cycleForPriceId(null, env)).toBe("monthly");
  });
});
