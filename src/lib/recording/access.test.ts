// recordingAccess pins (Team Access Phase 10): the caller's own
// subscription result layered with the org grant from
// lib/team/entitlement — a granted member is not blocked as "free",
// their tier reflects the grant, a grant never downgrades the own
// tier, and ANY failure in the org lookup falls back to the own
// result (fail-soft).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  findSub: vi.fn(async () => null as null | {
    status: string;
    currentPeriodEnd: Date;
    stripePriceId: string;
  }),
  getEffective: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: { subscription: { findUnique: mocks.findSub } },
}));
vi.mock("@/lib/team/entitlement", () => ({
  getEffectiveEntitlement: mocks.getEffective,
  // The real merge (TIER_RANK order free < pro < vip), inlined so this
  // suite controls the entitlement module boundary completely.
  maxTier: (a: "free" | "pro" | "vip", b: "free" | "pro" | "vip") =>
    ({ free: 0, pro: 1, vip: 2 })[a] >= ({ free: 0, pro: 1, vip: 2 })[b] ? a : b,
}));

import { recordingAccess } from "./access";

const future = () => new Date(Date.now() + 30 * 24 * 3600 * 1000);
const sub = (stripePriceId: string, status = "active") => ({
  status,
  currentPeriodEnd: future(),
  stripePriceId,
});
const entitlement = (ownTier: string, effectiveTier: string) => ({
  ownTier,
  effectiveTier,
  sources: effectiveTier !== ownTier ? [{ orgId: "org1", orgName: "Team", role: "member", tier: effectiveTier }] : [],
});

let savedEnv: NodeJS.ProcessEnv;
beforeEach(() => {
  vi.clearAllMocks();
  savedEnv = { ...process.env };
  process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
  process.env.STRIPE_ENTERPRISE_PRICE_ID = "price_ent";
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.findSub.mockResolvedValue(null);
  mocks.getEffective.mockResolvedValue(entitlement("free", "free"));
});
afterEach(() => {
  process.env = savedEnv;
});

describe("recordingAccess — own subscription only (no grant)", () => {
  it("signed-out callers get ok:false", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(recordingAccess()).resolves.toEqual({ ok: false });
  });

  it("no subscription stays free", async () => {
    await expect(recordingAccess()).resolves.toEqual({
      ok: true, userId: "user-1", pro: false, tier: "free",
    });
  });

  it("own monthly is pro; own annual is vip", async () => {
    mocks.findSub.mockResolvedValue(sub("price_monthly"));
    mocks.getEffective.mockResolvedValue(entitlement("pro", "pro"));
    await expect(recordingAccess()).resolves.toEqual({
      ok: true, userId: "user-1", pro: true, tier: "pro",
    });
    mocks.findSub.mockResolvedValue(sub("price_annual"));
    mocks.getEffective.mockResolvedValue(entitlement("vip", "vip"));
    await expect(recordingAccess()).resolves.toEqual({
      ok: true, userId: "user-1", pro: true, tier: "vip",
    });
  });
});

describe("recordingAccess — team grant layering", () => {
  it("a free member of a VIP org records as vip, not free", async () => {
    mocks.getEffective.mockResolvedValue(entitlement("free", "vip"));
    await expect(recordingAccess()).resolves.toEqual({
      ok: true, userId: "user-1", pro: true, tier: "vip",
    });
  });

  it("a free member of a Pro org records as pro", async () => {
    mocks.getEffective.mockResolvedValue(entitlement("free", "pro"));
    await expect(recordingAccess()).resolves.toEqual({
      ok: true, userId: "user-1", pro: true, tier: "pro",
    });
  });

  it("a grant never downgrades the member's own tier", async () => {
    mocks.findSub.mockResolvedValue(sub("price_annual"));
    mocks.getEffective.mockResolvedValue(entitlement("vip", "pro"));
    await expect(recordingAccess()).resolves.toMatchObject({ pro: true, tier: "vip" });
  });

  it("fail-soft: an org-lookup error leaves the own result untouched", async () => {
    mocks.getEffective.mockRejectedValue(new Error("db down"));
    await expect(recordingAccess()).resolves.toEqual({
      ok: true, userId: "user-1", pro: false, tier: "free",
    });
    mocks.findSub.mockResolvedValue(sub("price_monthly"));
    await expect(recordingAccess()).resolves.toEqual({
      ok: true, userId: "user-1", pro: true, tier: "pro",
    });
  });
});
