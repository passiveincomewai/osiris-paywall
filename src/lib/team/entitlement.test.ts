import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    subscription: { findUnique: vi.fn() },
    organizationMember: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { getEffectiveEntitlement, recordingCapForTier, maxTier } from "./entitlement";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

const ENV = {
  STRIPE_WEEKLY_PRICE_ID: "price_weekly",
  STRIPE_MONTHLY_PRICE_ID: "price_monthly",
  STRIPE_ANNUAL_PRICE_ID: "price_annual",
  STRIPE_ENTERPRISE_PRICE_ID: "price_ent",
};
const future = new Date(Date.now() + 30 * 86400_000);
const past = new Date(Date.now() - 86400_000);
const subRow = (priceId: string, status = "active", end = future) => ({
  status,
  currentPeriodEnd: end,
  stripePriceId: priceId,
});
const membership = (ownerSub: unknown, suspended = false) => ({
  role: "member",
  organization: {
    id: "org1",
    name: "Team One",
    suspended,
    owner: { subscription: ownerSub },
  },
});

let savedEnv: NodeJS.ProcessEnv;
beforeEach(() => {
  vi.clearAllMocks();
  savedEnv = { ...process.env };
  Object.assign(process.env, ENV);
  mockDb.organizationMember.findMany.mockResolvedValue([]);
});
afterEach(() => {
  process.env = savedEnv;
});

describe("getEffectiveEntitlement", () => {
  it("own tier only when there are no memberships", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(subRow("price_monthly"));
    const e = await getEffectiveEntitlement("u1");
    expect(e.ownTier).toBe("pro");
    expect(e.effectiveTier).toBe("pro");
    expect(e.sources).toEqual([]);
  });

  it("inherits the owner's VIP tier through a membership (max wins)", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.organizationMember.findMany.mockResolvedValue([membership(subRow("price_annual"))]);
    const e = await getEffectiveEntitlement("u1");
    expect(e.ownTier).toBe("free");
    expect(e.effectiveTier).toBe("vip");
    expect(e.sources).toHaveLength(1);
    expect(e.sources[0]).toMatchObject({ orgId: "org1", tier: "vip" });
  });

  it("a suspended org grants nothing", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.organizationMember.findMany.mockResolvedValue([membership(subRow("price_annual"), true)]);
    const e = await getEffectiveEntitlement("u1");
    expect(e.effectiveTier).toBe("free");
    expect(e.sources).toEqual([]);
  });

  it("a canceled owner subscription grants nothing", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(null);
    mockDb.organizationMember.findMany.mockResolvedValue([
      membership(subRow("price_annual", "canceled", past)),
    ]);
    const e = await getEffectiveEntitlement("u1");
    expect(e.effectiveTier).toBe("free");
    expect(e.sources).toEqual([]);
  });

  it("own VIP is never downgraded by a Pro org", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(subRow("price_annual"));
    mockDb.organizationMember.findMany.mockResolvedValue([membership(subRow("price_monthly"))]);
    const e = await getEffectiveEntitlement("u1");
    expect(e.effectiveTier).toBe("vip");
  });

  it("fail-soft: a failing membership lookup falls back to the own tier", async () => {
    mockDb.subscription.findUnique.mockResolvedValue(subRow("price_monthly"));
    mockDb.organizationMember.findMany.mockRejectedValue(new Error("db down"));
    const e = await getEffectiveEntitlement("u1");
    expect(e.ownTier).toBe("pro");
    expect(e.effectiveTier).toBe("pro");
    expect(e.sources).toEqual([]);
  });
});

describe("recordingCapForTier / maxTier", () => {
  it("maps tiers to the shared recording caps", () => {
    expect(recordingCapForTier("free")).toBe(0);
    expect(recordingCapForTier("pro")).toBe(20);
    expect(recordingCapForTier("vip")).toBe(40);
  });
  it("maxTier picks the higher tier", () => {
    expect(maxTier("pro", "vip")).toBe("vip");
    expect(maxTier("vip", "free")).toBe("vip");
    expect(maxTier("free", "free")).toBe("free");
  });
});
