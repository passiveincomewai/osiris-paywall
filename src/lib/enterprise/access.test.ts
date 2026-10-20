// Access pins: enterprise means an active/trialing subscription on the
// enterprise Stripe price, inside its paid period. Pro is not enterprise;
// a missing env price id recognizes nobody (never guess tiers).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  findSub: vi.fn(async () => null as null | {
    stripePriceId: string;
    status: string;
    currentPeriodEnd: Date;
  }),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: { subscription: { findUnique: mocks.findSub } },
}));

import { enterpriseAccess, userHasLiveEnterprise } from "./access";

const ENT = "price_enterprise_test";
const PRO = "price_annual_test";
const future = () => new Date(Date.now() + 30 * 24 * 3600 * 1000);
const past = () => new Date(Date.now() - 1000);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_ENTERPRISE_PRICE_ID = ENT;
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.findSub.mockResolvedValue({ stripePriceId: ENT, status: "active", currentPeriodEnd: future() });
});

afterEach(() => {
  delete process.env.STRIPE_ENTERPRISE_PRICE_ID;
});

describe("enterpriseAccess", () => {
  it("grants enterprise for a live enterprise subscription", async () => {
    await expect(enterpriseAccess()).resolves.toEqual({ ok: true, userId: "user-1", enterprise: true });
  });

  it("denies enterprise for a Pro subscription", async () => {
    mocks.findSub.mockResolvedValue({ stripePriceId: PRO, status: "active", currentPeriodEnd: future() });
    await expect(enterpriseAccess()).resolves.toEqual({ ok: true, userId: "user-1", enterprise: false });
  });

  it("denies enterprise when the period has ended or the sub is canceled", async () => {
    mocks.findSub.mockResolvedValue({ stripePriceId: ENT, status: "active", currentPeriodEnd: past() });
    await expect(enterpriseAccess()).resolves.toMatchObject({ enterprise: false });
    mocks.findSub.mockResolvedValue({ stripePriceId: ENT, status: "canceled", currentPeriodEnd: future() });
    await expect(enterpriseAccess()).resolves.toMatchObject({ enterprise: false });
  });

  it("accepts trialing enterprise subscriptions", async () => {
    mocks.findSub.mockResolvedValue({ stripePriceId: ENT, status: "trialing", currentPeriodEnd: future() });
    await expect(enterpriseAccess()).resolves.toMatchObject({ enterprise: true });
  });

  it("signed-out callers get ok:false", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(enterpriseAccess()).resolves.toEqual({ ok: false });
  });

  it("recognizes nobody when the enterprise price env is unset", async () => {
    delete process.env.STRIPE_ENTERPRISE_PRICE_ID;
    await expect(enterpriseAccess()).resolves.toMatchObject({ enterprise: false });
    await expect(userHasLiveEnterprise("user-1")).resolves.toBe(false);
  });
});
