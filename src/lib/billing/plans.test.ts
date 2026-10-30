// Central plan config pins (Pricing Redesign Phase A).
//
// These tests pin the facts every later phase builds on: trial lengths
// DERIVED from TRIAL_DAYS (never restated), display prices, env-only
// price resolution for the new tiers (unconfigured ⇒ not sellable),
// price → {tier, period} for all 9 grid prices + legacy + dead +
// unknown ids, the legacy-VIP cutoff, and the entitlements matrix.
//
// The Lite/Ultra price ids below are the verified live ids from
// ~/workspace/pricing-redesign/PRICE-IDS.md, used ONLY as fixture env
// values — runtime code resolves ids from env and hardcodes none.
import { describe, it, expect } from "vitest";
import {
  LEGACY_VIP_CUTOFF,
  entitlementsFor,
  hasLegacyVip,
  legacyVipFor,
  planNameByPriceId,
  resolvePlan,
  resolvePlans,
  resolvePriceId,
  type PlanKey,
} from "./plans";
import { TRIAL_DAYS } from "./trials";

const ENV = {
  STRIPE_WEEKLY_PRICE_ID: "price_1USW4lGfHuTnzrlHoBwtyZWc",
  STRIPE_MONTHLY_PRICE_ID: "price_1USW54GfHuTnzrlHDfvVQPsk",
  STRIPE_ANNUAL_PRICE_ID: "price_1USW5HGfHuTnzrlHveoTpmwd",
  STRIPE_ENTERPRISE_PRICE_ID: "price_1UPHA5GfHuTnzrlHOmQsgF1g",
  STRIPE_LITE_WEEKLY_PRICE_ID: "price_1UW38lGfHuTnzrlHERR2wg71",
  STRIPE_LITE_MONTHLY_PRICE_ID: "price_1UW396GfHuTnzrlHN4VFRgRC",
  STRIPE_LITE_ANNUAL_PRICE_ID: "price_1UW39cGfHuTnzrlHdEBHndfg",
  STRIPE_ULTRA_WEEKLY_PRICE_ID: "price_1UW3A4GfHuTnzrlHoUDyI5bj",
  STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_1UW3AOGfHuTnzrlH1m0wp8tA",
  STRIPE_ULTRA_ANNUAL_PRICE_ID: "price_1UW3AmGfHuTnzrlHXDg5Rd5N",
};

const GRID: Array<{ key: PlanKey; tier: string; period: string; price: string; priceId: string }> = [
  { key: "lite_weekly", tier: "lite", period: "weekly", price: "$4.99", priceId: ENV.STRIPE_LITE_WEEKLY_PRICE_ID },
  { key: "lite_monthly", tier: "lite", period: "monthly", price: "$8.99", priceId: ENV.STRIPE_LITE_MONTHLY_PRICE_ID },
  { key: "lite_annual", tier: "lite", period: "annual", price: "$44.99", priceId: ENV.STRIPE_LITE_ANNUAL_PRICE_ID },
  { key: "pro_weekly", tier: "pro", period: "weekly", price: "$7.99", priceId: ENV.STRIPE_WEEKLY_PRICE_ID },
  { key: "pro_monthly", tier: "pro", period: "monthly", price: "$13.99", priceId: ENV.STRIPE_MONTHLY_PRICE_ID },
  { key: "pro_annual", tier: "pro", period: "annual", price: "$74.99", priceId: ENV.STRIPE_ANNUAL_PRICE_ID },
  { key: "ultra_weekly", tier: "ultra", period: "weekly", price: "$12.99", priceId: ENV.STRIPE_ULTRA_WEEKLY_PRICE_ID },
  { key: "ultra_monthly", tier: "ultra", period: "monthly", price: "$24.99", priceId: ENV.STRIPE_ULTRA_MONTHLY_PRICE_ID },
  { key: "ultra_annual", tier: "ultra", period: "annual", price: "$149.99", priceId: ENV.STRIPE_ULTRA_ANNUAL_PRICE_ID },
];

describe("resolvePlan — grid plans", () => {
  it("carries tier, period, display price and the env price id per key", () => {
    for (const g of GRID) {
      const plan = resolvePlan(g.key, ENV);
      expect(plan.tier).toBe(g.tier);
      expect(plan.period).toBe(g.period);
      expect(plan.displayPrice).toBe(g.price);
      expect(plan.priceId).toBe(g.priceId);
      expect(plan.sellable).toBe(true);
    }
  });

  it("derives trial days from TRIAL_DAYS by period: 3 / 10 / 10 for EVERY tier", () => {
    for (const g of GRID) {
      const plan = resolvePlan(g.key, ENV);
      expect(plan.trialDays).toBe(TRIAL_DAYS[g.period as "weekly" | "monthly" | "annual"]);
    }
    expect(resolvePlan("lite_weekly", ENV).trialDays).toBe(3);
    expect(resolvePlan("pro_monthly", ENV).trialDays).toBe(10);
    expect(resolvePlan("ultra_annual", ENV).trialDays).toBe(10);
  });

  it("standalone plans derive trials from their own TRIAL_DAYS entries", () => {
    expect(resolvePlan("enterprise", ENV).trialDays).toBe(TRIAL_DAYS.enterprise);
    expect(resolvePlan("ambient", ENV).trialDays).toBe(TRIAL_DAYS.ambient);
    expect(resolvePlan("ski", ENV).trialDays).toBe(TRIAL_DAYS.ski);
  });
});

describe("resolvePlan — env-only resolution, no hardcoded fallbacks", () => {
  it("unconfigured Lite/Ultra prices are null and not sellable", () => {
    const plans = resolvePlans({});
    for (const key of [
      "lite_weekly",
      "lite_monthly",
      "lite_annual",
      "ultra_weekly",
      "ultra_monthly",
      "ultra_annual",
      "pro_weekly",
      "pro_monthly",
      "pro_annual",
      "enterprise",
      "ski",
    ] as PlanKey[]) {
      expect(plans[key].priceId).toBeNull();
      expect(plans[key].sellable).toBe(false);
    }
  });

  it("an empty-string env value is unconfigured, never a price id", () => {
    expect(resolvePlan("lite_weekly", { STRIPE_LITE_WEEKLY_PRICE_ID: "" }).sellable).toBe(false);
  });

  it("ambient keeps its pre-existing fallback id (env wins when set)", () => {
    expect(resolvePlan("ambient", {}).priceId).toBe("price_1UUxUnGfHuTnzrlHH0pNYhJU");
    expect(resolvePlan("ambient", { STRIPE_AMBIENT_PRICE_ID: "price_ambient_env" }).priceId).toBe(
      "price_ambient_env",
    );
  });
});

describe("resolvePriceId — every known price", () => {
  it("resolves all 9 grid prices to their {tier, period, planKey}", () => {
    for (const g of GRID) {
      const res = resolvePriceId(g.priceId, ENV);
      expect(res.known).toBe(true);
      expect(res.tier).toBe(g.tier);
      expect(res.period).toBe(g.period);
      expect(res.planKey).toBe(g.key);
      expect(res.standalone).toBeNull();
    }
  });

  it("resolves enterprise to the top tier and ambient/ski as standalone", () => {
    const ent = resolvePriceId(ENV.STRIPE_ENTERPRISE_PRICE_ID, ENV);
    expect(ent).toMatchObject({ known: true, planKey: "enterprise", tier: "ultra", period: "annual" });
    const amb = resolvePriceId("price_1UUxUnGfHuTnzrlHH0pNYhJU", {});
    expect(amb).toMatchObject({ known: true, planKey: "ambient", tier: null, standalone: "ambient" });
    const ski = resolvePriceId("price_ski_x", { POWDER_PASS_PRICE_ID: "price_ski_x" });
    expect(ski).toMatchObject({ known: true, planKey: "ski", tier: null, standalone: "ski" });
  });

  it("resolves the grandfathered prices to Pro with their periods", () => {
    expect(resolvePriceId("price_1UPH6KGfHuTnzrlHDBzDHobj", ENV)).toMatchObject({
      known: true, tier: "pro", period: "weekly", planKey: "pro_weekly", legacyVipEligible: false,
    });
    expect(resolvePriceId("price_1UPGwjGfHuTnzrlHwwU5k4WO", ENV)).toMatchObject({
      known: true, tier: "pro", period: "monthly", planKey: "pro_monthly", legacyVipEligible: false,
    });
    expect(resolvePriceId("price_1UPH7MGfHuTnzrlHxbGXji4K", ENV)).toMatchObject({
      known: true, tier: "pro", period: "annual", planKey: "pro_annual", legacyVipEligible: true,
    });
  });

  it("marks the current annual price legacy-VIP eligible, via env or literal", () => {
    expect(resolvePriceId(ENV.STRIPE_ANNUAL_PRICE_ID, ENV).legacyVipEligible).toBe(true);
    // Even with the env var pointing elsewhere, the literal price keeps
    // its eligibility — it attaches to the price, not the env slot.
    const rotated = { ...ENV, STRIPE_ANNUAL_PRICE_ID: "price_some_future_annual" };
    expect(resolvePriceId("price_1USW5HGfHuTnzrlHveoTpmwd", rotated)).toMatchObject({
      known: true, tier: "pro", period: "annual", legacyVipEligible: true,
    });
    // A rotated env annual price carries the eligibility too — it
    // attaches to the Pro annual plan, not only to today's literal id.
    expect(resolvePriceId("price_some_future_annual", rotated)).toMatchObject({
      known: true, tier: "pro", period: "annual", legacyVipEligible: true,
    });
  });

  it("resolves the dead legacy prices to the Pro default", () => {
    for (const dead of [
      "price_1UPGxdGfHuTnzrlHpaLBMFv5",
      "price_1UPGwHGfHuTnzrlHHXjun0oW",
      "price_1UPGw1GfHuTnzrlHcyYpGH1H",
    ]) {
      expect(resolvePriceId(dead, ENV)).toMatchObject({ known: true, tier: "pro" });
    }
  });

  it("unknown live prices default to Pro (never strip a payer), flagged unknown", () => {
    expect(resolvePriceId("price_never_seen_before", ENV)).toMatchObject({
      known: false, tier: "pro", planKey: null, legacyVipEligible: false,
    });
    expect(resolvePriceId(null, ENV).known).toBe(false);
    expect(resolvePriceId(undefined, ENV).known).toBe(false);
  });
});

describe("legacy VIP cutoff", () => {
  const before = new Date("2026-10-29T23:59:59Z");
  const after = new Date("2026-11-15T00:00:00Z");

  it("the cutoff is 2026-10-30T00:00:00Z", () => {
    expect(LEGACY_VIP_CUTOFF.toISOString()).toBe("2026-10-30T00:00:00.000Z");
  });

  it("pre-cutoff holders of the annual prices keep VIP extras; post-cutoff do not", () => {
    expect(hasLegacyVip("price_1USW5HGfHuTnzrlHveoTpmwd", ENV, before)).toBe(true);
    expect(hasLegacyVip("price_1USW5HGfHuTnzrlHveoTpmwd", ENV, after)).toBe(false);
    expect(hasLegacyVip("price_1USW5HGfHuTnzrlHveoTpmwd", ENV, LEGACY_VIP_CUTOFF)).toBe(false);
    expect(hasLegacyVip("price_1UPH7MGfHuTnzrlHxbGXji4K", ENV, before)).toBe(true);
    expect(hasLegacyVip("price_1UPH7MGfHuTnzrlHxbGXji4K", ENV, after)).toBe(false);
  });

  it("non-annual prices never carry legacy VIP, whatever the date", () => {
    expect(hasLegacyVip("price_1UPH6KGfHuTnzrlHDBzDHobj", ENV, before)).toBe(false);
    expect(hasLegacyVip(ENV.STRIPE_ULTRA_ANNUAL_PRICE_ID, ENV, before)).toBe(false);
    expect(hasLegacyVip("price_unknown", ENV, before)).toBe(false);
  });

  it("an unknown creation date keeps the legacy reading (never strip a holder)", () => {
    const res = resolvePriceId("price_1USW5HGfHuTnzrlHveoTpmwd", ENV);
    expect(legacyVipFor(res)).toBe(true);
    expect(legacyVipFor(res, null)).toBe(true);
    expect(legacyVipFor(res, "2026-10-01T00:00:00Z")).toBe(true);
    expect(legacyVipFor(res, "2027-01-01T00:00:00Z")).toBe(false);
  });
});

describe("entitlementsFor — the matrix", () => {
  it("free gets nothing", () => {
    expect(entitlementsFor("free")).toEqual({
      unlimitedOpens: false,
      premiumLayers: false,
      oiAssistant: false,
      searchFilters: false,
      recordingStudio: false,
      multiCamCap: 0,
      alertCap: 0,
      timelapse: false,
      intelFeeds: false,
      ambientBypass: false,
    });
  });

  it("lite: paid baseline, multi-cam 5, alerts 0, no timelapse/intel", () => {
    expect(entitlementsFor("lite")).toEqual({
      unlimitedOpens: true,
      premiumLayers: true,
      oiAssistant: true,
      searchFilters: true,
      recordingStudio: true,
      multiCamCap: 5,
      alertCap: 0,
      timelapse: false,
      intelFeeds: false,
      ambientBypass: true,
    });
  });

  it("pro: alerts 2, multi-cam 20, no timelapse/intel", () => {
    const ent = entitlementsFor("pro");
    expect(ent.alertCap).toBe(2);
    expect(ent.multiCamCap).toBe(20);
    expect(ent.timelapse).toBe(false);
    expect(ent.intelFeeds).toBe(false);
    expect(ent.premiumLayers).toBe(true);
    expect(ent.ambientBypass).toBe(true);
  });

  it("ultra: alerts 10, multi-cam 40, timelapse + intel feeds", () => {
    const ent = entitlementsFor("ultra");
    expect(ent.alertCap).toBe(10);
    expect(ent.multiCamCap).toBe(40);
    expect(ent.timelapse).toBe(true);
    expect(ent.intelFeeds).toBe(true);
  });

  it("legacyVip raises a Pro holder to the VIP extras", () => {
    const ent = entitlementsFor("pro", { legacyVip: true });
    expect(ent.alertCap).toBe(10);
    expect(ent.multiCamCap).toBe(40);
    expect(ent.timelapse).toBe(true);
    expect(ent.intelFeeds).toBe(true);
  });
});

describe("planNameByPriceId — reminder naming", () => {
  it("names all 9 grid prices + enterprise; Pro keeps its period names", () => {
    const map = planNameByPriceId(ENV);
    expect(map[ENV.STRIPE_WEEKLY_PRICE_ID]).toBe("weekly");
    expect(map[ENV.STRIPE_MONTHLY_PRICE_ID]).toBe("monthly");
    expect(map[ENV.STRIPE_ANNUAL_PRICE_ID]).toBe("annual");
    expect(map[ENV.STRIPE_ENTERPRISE_PRICE_ID]).toBe("enterprise");
    expect(map[ENV.STRIPE_LITE_WEEKLY_PRICE_ID]).toBe("lite_weekly");
    expect(map[ENV.STRIPE_LITE_MONTHLY_PRICE_ID]).toBe("lite_monthly");
    expect(map[ENV.STRIPE_LITE_ANNUAL_PRICE_ID]).toBe("lite_annual");
    expect(map[ENV.STRIPE_ULTRA_WEEKLY_PRICE_ID]).toBe("ultra_weekly");
    expect(map[ENV.STRIPE_ULTRA_MONTHLY_PRICE_ID]).toBe("ultra_monthly");
    expect(map[ENV.STRIPE_ULTRA_ANNUAL_PRICE_ID]).toBe("ultra_annual");
  });

  it("names the grandfathered prices as their Pro plans", () => {
    const map = planNameByPriceId({});
    expect(map["price_1UPH6KGfHuTnzrlHDBzDHobj"]).toBe("weekly");
    expect(map["price_1UPGwjGfHuTnzrlHwwU5k4WO"]).toBe("monthly");
    expect(map["price_1UPH7MGfHuTnzrlHxbGXji4K"]).toBe("annual");
    expect(map["price_1USW5HGfHuTnzrlHveoTpmwd"]).toBe("annual");
  });
});
