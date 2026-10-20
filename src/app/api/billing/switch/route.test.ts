// Switch-endpoint pins (scope G): auth, own-sub-only by construction,
// trial-end preservation, and Stripe's standard proration for active subs.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string } } | null),
  findSubscription: vi.fn(async () => null as unknown),
  retrieveSub: vi.fn(async () => ({}) as unknown),
  updateSub: vi.fn(async () => ({})),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: { subscription: { findUnique: mocks.findSubscription } },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: () => ({
    subscriptions: { retrieve: mocks.retrieveSub, update: mocks.updateSub },
  }),
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/billing/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const ROW = {
  userId: "user_1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_own",
  stripePriceId: "price_weekly",
  status: "active",
  currentPeriodEnd: new Date("2026-10-27T12:00:00.000Z"),
  cancelAtPeriodEnd: false,
};

const stripeSub = (over: Record<string, unknown> = {}) => ({
  id: "sub_own",
  customer: "cus_1",
  status: "active",
  trial_end: null,
  items: { data: [{ id: "si_1", price: { id: "price_weekly" } }] },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
  mocks.auth.mockResolvedValue({ user: { id: "user_1" } });
  mocks.findSubscription.mockResolvedValue(ROW);
  mocks.retrieveSub.mockResolvedValue(stripeSub());
});

afterEach(() => {
  delete process.env.STRIPE_WEEKLY_PRICE_ID;
  delete process.env.STRIPE_MONTHLY_PRICE_ID;
  delete process.env.STRIPE_ANNUAL_PRICE_ID;
});

describe("POST /api/billing/switch", () => {
  it("401 when signed out", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post({ plan: "annual" });
    expect(res.status).toBe(401);
    expect(mocks.updateSub).not.toHaveBeenCalled();
  });

  it("400 for a non-self-serve plan name", async () => {
    expect((await post({ plan: "enterprise" })).status).toBe(400);
    expect((await post({ plan: "bogus" })).status).toBe(400);
    expect(mocks.updateSub).not.toHaveBeenCalled();
  });

  it("404 when the caller has no subscription", async () => {
    mocks.findSubscription.mockResolvedValue(null);
    expect((await post({ plan: "annual" })).status).toBe(404);
  });

  it("own-sub only: a foreign subscription id in the body is ignored — the caller's row is swapped", async () => {
    const res = await post({ plan: "annual", subscriptionId: "sub_someone_else", stripeSubscriptionId: "sub_someone_else" });
    expect(res.status).toBe(200);
    expect(mocks.retrieveSub).toHaveBeenCalledWith("sub_own");
    expect(mocks.updateSub).toHaveBeenCalledWith(
      "sub_own",
      expect.objectContaining({ items: [{ id: "si_1", price: "price_annual" }] }),
    );
  });

  it("the DB lookup is keyed by the SESSION user, never by request input", async () => {
    await post({ plan: "monthly", userId: "user_2" });
    expect(mocks.findSubscription).toHaveBeenCalledWith({ where: { userId: "user_1" } });
  });

  it("active sub: swap with Stripe's standard proration", async () => {
    const res = await post({ plan: "annual" });
    expect(res.status).toBe(200);
    expect(mocks.updateSub).toHaveBeenCalledWith("sub_own", {
      items: [{ id: "si_1", price: "price_annual" }],
      proration_behavior: "create_prorations",
    });
  });

  it("trialing sub: trial_end preserved EXACTLY and proration off", async () => {
    const trialEnd = 1792713600;
    mocks.retrieveSub.mockResolvedValue(stripeSub({ status: "trialing", trial_end: trialEnd }));
    const res = await post({ plan: "monthly" });
    expect(res.status).toBe(200);
    expect(mocks.updateSub).toHaveBeenCalledWith("sub_own", {
      items: [{ id: "si_1", price: "price_monthly" }],
      trial_end: trialEnd,
      proration_behavior: "none",
    });
  });

  it("400 when already on the target plan", async () => {
    expect((await post({ plan: "weekly" })).status).toBe(400);
    expect(mocks.updateSub).not.toHaveBeenCalled();
  });

  it("400 for comp rows (never swapped)", async () => {
    mocks.findSubscription.mockResolvedValue({ ...ROW, stripeSubscriptionId: "comp_creator_user_1" });
    expect((await post({ plan: "annual" })).status).toBe(400);
    expect(mocks.updateSub).not.toHaveBeenCalled();
  });
});
