import { describe, expect, it } from "vitest";
import { resolveRecordingTier, tierForPlan, tierForPriceId } from "./tier";

const ENV: Record<string, string | undefined> = {
  STRIPE_WEEKLY_PRICE_ID: "price_weekly_current",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly_current",
  STRIPE_ANNUAL_PRICE_ID: "price_annual_current",
  STRIPE_ENTERPRISE_PRICE_ID: "price_enterprise_current",
};

describe("tierForPlan", () => {
  it("annual and enterprise are VIP; weekly and monthly are Pro", () => {
    expect(tierForPlan("annual")).toBe("vip");
    expect(tierForPlan("enterprise")).toBe("vip");
    expect(tierForPlan("weekly")).toBe("pro");
    expect(tierForPlan("monthly")).toBe("pro");
  });

  it("anything else carries no tier", () => {
    expect(tierForPlan(null)).toBeNull();
    expect(tierForPlan(undefined)).toBeNull();
    expect(tierForPlan("")).toBeNull();
    expect(tierForPlan("lifetime")).toBeNull();
  });
});

describe("tierForPriceId", () => {
  it("resolves through the env price config, the studio's one source", () => {
    expect(tierForPriceId("price_annual_current", ENV)).toBe("vip");
    expect(tierForPriceId("price_enterprise_current", ENV)).toBe("vip");
    expect(tierForPriceId("price_weekly_current", ENV)).toBe("pro");
    expect(tierForPriceId("price_monthly_current", ENV)).toBe("pro");
  });

  it("an unrecognized price id resolves no tier", () => {
    expect(tierForPriceId("price_from_before_a_rotation", ENV)).toBeNull();
    expect(tierForPriceId(null, ENV)).toBeNull();
    expect(tierForPriceId("", ENV)).toBeNull();
  });
});

describe("Phase A bridge — central plan config", () => {
  const BRIDGE_ENV: Record<string, string | undefined> = {
    ...ENV,
    STRIPE_ANNUAL_PRICE_ID: "price_1USW5HGfHuTnzrlHveoTpmwd",
    STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_monthly",
    STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_ultra_monthly",
  };

  it("ultra prices are vip; lite prices carry no old-contract tier", () => {
    expect(tierForPriceId("price_ultra_monthly", BRIDGE_ENV)).toBe("vip");
    expect(tierForPriceId("price_lite_monthly", BRIDGE_ENV)).toBeNull();
    expect(
      resolveRecordingTier({ pro: true, stripePriceId: "price_lite_monthly", env: BRIDGE_ENV }),
    ).toBe("free");
    expect(
      resolveRecordingTier({ pro: true, stripePriceId: "price_ultra_monthly", env: BRIDGE_ENV }),
    ).toBe("vip");
  });

  it("grandfathered annual keeps vip; the annual cutoff applies when createdAt is known", () => {
    expect(tierForPriceId("price_1UPH7MGfHuTnzrlHxbGXji4K", BRIDGE_ENV)).toBe("vip");
    expect(
      resolveRecordingTier({
        pro: true,
        stripePriceId: "price_1USW5HGfHuTnzrlHveoTpmwd",
        env: BRIDGE_ENV,
        createdAt: new Date("2026-10-01T00:00:00Z"),
      }),
    ).toBe("vip");
    expect(
      resolveRecordingTier({
        pro: true,
        stripePriceId: "price_1USW5HGfHuTnzrlHveoTpmwd",
        env: BRIDGE_ENV,
        createdAt: new Date("2026-12-01T00:00:00Z"),
      }),
    ).toBe("pro");
  });
});

describe("resolveRecordingTier", () => {
  it("no active subscription is free, whatever the price says", () => {
    expect(resolveRecordingTier({ pro: false, stripePriceId: "price_annual_current", env: ENV })).toBe("free");
    expect(resolveRecordingTier({ pro: false, stripePriceId: null, env: ENV })).toBe("free");
  });

  it("an active annual (VIP Pro) subscriber is vip", () => {
    expect(resolveRecordingTier({ pro: true, stripePriceId: "price_annual_current", env: ENV })).toBe("vip");
  });

  it("an active weekly/monthly subscriber is pro", () => {
    expect(resolveRecordingTier({ pro: true, stripePriceId: "price_weekly_current", env: ENV })).toBe("pro");
    expect(resolveRecordingTier({ pro: true, stripePriceId: "price_monthly_current", env: ENV })).toBe("pro");
  });

  it("a paying subscriber on an unrecognized price keeps Pro, never gains VIP", () => {
    expect(resolveRecordingTier({ pro: true, stripePriceId: "price_legacy_unknown", env: ENV })).toBe("pro");
    expect(resolveRecordingTier({ pro: true, stripePriceId: null, env: ENV })).toBe("pro");
  });
});
