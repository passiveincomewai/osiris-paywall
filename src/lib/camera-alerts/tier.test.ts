import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const entMocks = vi.hoisted(() => ({ getEffective: vi.fn() }));

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => ({ db: { subscription: { findUnique: vi.fn() } } }));
vi.mock("@/lib/team/entitlement", () => ({
  getEffectiveEntitlement: entMocks.getEffective,
  // The real merge (TIER_RANK order free < pro < vip), inlined so this
  // suite controls the entitlement module boundary completely.
  maxTier: (a: "free" | "pro" | "vip", b: "free" | "pro" | "vip") =>
    ({ free: 0, pro: 1, vip: 2 })[a] >= ({ free: 0, pro: 1, vip: 2 })[b] ? a : b,
}));

import { db } from "@/lib/db";
import { tierFromSubscription, getUserTier } from "./tier";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

describe("tierFromSubscription — annual is VIP", () => {
  const env = {
    STRIPE_WEEKLY_PRICE_ID: "price_weekly",
    STRIPE_MONTHLY_PRICE_ID: "price_monthly",
    STRIPE_ANNUAL_PRICE_ID: "price_annual",
    STRIPE_ENTERPRISE_PRICE_ID: "price_ent",
  };
  const now = new Date("2026-10-20T12:00:00Z");
  const future = new Date("2026-11-20T12:00:00Z");
  const past = new Date("2026-10-01T12:00:00Z");
  const sub = (over: Partial<{ status: string; currentPeriodEnd: Date; stripePriceId: string; createdAt?: Date }>) => ({
    status: "active",
    currentPeriodEnd: future,
    stripePriceId: "price_monthly",
    ...over,
  });

  it("no subscription, dead status or an ended period is free", () => {
    expect(tierFromSubscription(null, env, now)).toBe("free");
    expect(tierFromSubscription(sub({ status: "canceled" }), env, now)).toBe("free");
    expect(tierFromSubscription(sub({ status: "past_due" }), env, now)).toBe("free");
    expect(tierFromSubscription(sub({ currentPeriodEnd: past }), env, now)).toBe("free");
  });
  it("weekly, monthly and trialing members are pro", () => {
    expect(tierFromSubscription(sub({ stripePriceId: "price_weekly" }), env, now)).toBe("pro");
    expect(tierFromSubscription(sub({ status: "trialing", stripePriceId: "price_monthly" }), env, now)).toBe("pro");
    expect(tierFromSubscription(sub({ stripePriceId: "price_ent" }), env, now)).toBe("pro");
    // A comp row carries no Stripe price the env knows — still Pro, never VIP.
    expect(tierFromSubscription(sub({ stripePriceId: "comp-internal" }), env, now)).toBe("pro");
  });
  it("standalone products (ambient/ski) are free — no tier, no alert rules", () => {
    // The Ambient fallback price id from the central config's legacy
    // table; it resolves standalone regardless of env configuration.
    expect(
      tierFromSubscription(sub({ stripePriceId: "price_1UUxUnGfHuTnzrlHH0pNYhJU" }), env, now),
    ).toBe("free");
    expect(
      tierFromSubscription(
        sub({ status: "trialing", stripePriceId: "price_1UUxUnGfHuTnzrlHH0pNYhJU" }),
        env,
        now,
      ),
    ).toBe("free");
  });
  it("the annual price is vip — paid or trialing", () => {
    expect(tierFromSubscription(sub({ stripePriceId: "price_annual" }), env, now)).toBe("vip");
    expect(tierFromSubscription(sub({ status: "trialing", stripePriceId: "price_annual" }), env, now)).toBe("vip");
  });

  it("Phase A bridge: ultra is vip, lite is free-equivalent, post-cutoff annual is pro", () => {
    const bridgeEnv = {
      ...env,
      STRIPE_ANNUAL_PRICE_ID: "price_1USW5HGfHuTnzrlHveoTpmwd",
      STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_monthly",
      STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_ultra_monthly",
    };
    expect(tierFromSubscription(sub({ stripePriceId: "price_ultra_monthly" }), bridgeEnv, now)).toBe("vip");
    expect(tierFromSubscription(sub({ stripePriceId: "price_lite_monthly" }), bridgeEnv, now)).toBe("free");
    // Legacy-VIP cutoff on the real annual price: before → vip, after → pro.
    expect(
      tierFromSubscription(
        sub({ stripePriceId: "price_1USW5HGfHuTnzrlHveoTpmwd", createdAt: new Date("2026-10-01T00:00:00Z") }),
        bridgeEnv,
        now,
      ),
    ).toBe("vip");
    expect(
      tierFromSubscription(
        sub({ stripePriceId: "price_1USW5HGfHuTnzrlHveoTpmwd", createdAt: new Date("2026-12-01T00:00:00Z") }),
        bridgeEnv,
        now,
      ),
    ).toBe("pro");
  });
});

describe("getUserTier — team grant layering (Phase 10)", () => {
  const future = new Date(Date.now() + 30 * 86400_000);
  const ownSub = (stripePriceId: string) => ({
    status: "active",
    currentPeriodEnd: future,
    stripePriceId,
  });
  let savedEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv = { ...process.env };
    process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly";
    process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
    process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
    process.env.STRIPE_ENTERPRISE_PRICE_ID = "price_ent";
    mockDb.subscription.findUnique.mockResolvedValue(null);
    entMocks.getEffective.mockResolvedValue({ ownTier: "free", effectiveTier: "free", sources: [] });
  });
  afterEach(() => {
    process.env = savedEnv;
  });

  it("a free member of a VIP org is vip (alerts unlock)", async () => {
    entMocks.getEffective.mockResolvedValue({
      ownTier: "free",
      effectiveTier: "vip",
      sources: [{ orgId: "org1", orgName: "Team", role: "member", tier: "vip" }],
    });
    await expect(getUserTier("u1")).resolves.toBe("vip");
  });

  it("a pro member of a VIP org is upgraded to vip; a grant never downgrades", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(ownSub("price_monthly"));
    entMocks.getEffective.mockResolvedValue({ ownTier: "pro", effectiveTier: "vip", sources: [] });
    await expect(getUserTier("u1")).resolves.toBe("vip");
    entMocks.getEffective.mockResolvedValue({ ownTier: "pro", effectiveTier: "free", sources: [] });
    await expect(getUserTier("u1")).resolves.toBe("pro");
  });

  it("fail-soft: an org-lookup error leaves the own tier", async () => {
    entMocks.getEffective.mockRejectedValue(new Error("db down"));
    await expect(getUserTier("u1")).resolves.toBe("free");
    mockDb.subscription.findUnique.mockResolvedValue(ownSub("price_annual"));
    await expect(getUserTier("u1")).resolves.toBe("vip");
  });
});
