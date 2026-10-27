// Checkout route tests: pin the session parameters BOTH presentations of
// checkout rely on — hosted (redirect to checkout.stripe.com) and embedded
// (ui_mode:"embedded", mounted on /checkout). Plan logic (price env, trial
// days, enterprise-no-trial, guest/member completion targets) is shared, so
// each behavior is asserted in both modes where it applies.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => null as { user?: { id?: string; email?: string } } | null),
  findSubscription: vi.fn(async () => null as unknown),
  createSession: vi.fn(async () => ({
    url: "https://checkout.stripe.com/c/pay/cs_test_123",
    client_secret: "cs_test_123_secret_xyz",
  })),
  createCustomer: vi.fn(async () => ({ id: "cus_test_1" })),
  listCustomers: vi.fn(async () => ({ data: [] as unknown[] })),
  listSubscriptions: vi.fn(async () => ({ data: [] as unknown[] })),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: { subscription: { findUnique: mocks.findSubscription } },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: () => ({
    checkout: { sessions: { create: mocks.createSession } },
    customers: { create: mocks.createCustomer, list: mocks.listCustomers },
    subscriptions: { list: mocks.listSubscriptions },
  }),
  appUrl: () => "https://worldeye.app",
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/affiliate/attribution", () => ({
  REF_COOKIE: "we_ref",
  findAffiliateByCode: async () => null,
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

/** The single argument sessions.create was called with. */
function createdParams(): Record<string, any> {
  expect(mocks.createSession).toHaveBeenCalledTimes(1);
  return (mocks.createSession.mock.calls as any)[0][0];
}

const PRICE_ENVS = [
  "STRIPE_WEEKLY_PRICE_ID",
  "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_ANNUAL_PRICE_ID",
  "STRIPE_ENTERPRISE_PRICE_ID",
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.findSubscription.mockResolvedValue(null);
  mocks.listCustomers.mockResolvedValue({ data: [] });
  mocks.listSubscriptions.mockResolvedValue({ data: [] });
  process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly";
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual";
  process.env.STRIPE_ENTERPRISE_PRICE_ID = "price_enterprise";
});

afterEach(() => {
  for (const k of PRICE_ENVS) delete process.env[k];
});

describe("POST /api/checkout — hosted mode (unchanged)", () => {
  it("creates a hosted session with success/cancel URLs and resolves {url}", async () => {
    const res = await post({ plan: "weekly" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
      // Additive (Meta CAPI wiring): the dedup event id for the
      // browser InitiateCheckout twin — generated per session.
      metaEventId: expect.any(String),
    });
    const p = createdParams();
    expect(p.mode).toBe("subscription");
    expect(p.line_items).toEqual([{ price: "price_weekly", quantity: 1 }]);
    expect(p.success_url).toBe(
      "https://worldeye.app/welcome?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(p.cancel_url).toBe("https://worldeye.app/pricing?checkout=cancelled");
    expect(p.ui_mode).toBeUndefined();
    expect(p.return_url).toBeUndefined();
  });

  it("applies the shared trial config: weekly 3, monthly 10, annual 10 days", async () => {
    for (const [plan, days] of [
      ["weekly", 3],
      ["monthly", 10],
      ["annual", 10],
    ] as const) {
      vi.clearAllMocks();
      await post({ plan });
      const p = createdParams();
      expect(p.subscription_data.trial_period_days).toBe(days);
      expect(p.payment_method_collection).toBe("always");
      expect(p.billing_address_collection).toBe("required");
    }
  });

  it("gives enterprise no trial and no up-front collection override", async () => {
    await post({ plan: "enterprise" });
    const p = createdParams();
    expect(p.line_items).toEqual([{ price: "price_enterprise", quantity: 1 }]);
    expect(p.subscription_data.trial_period_days).toBeUndefined();
    expect(p.payment_method_collection).toBeUndefined();
    expect(p.billing_address_collection).toBe("required");
  });
});

describe("POST /api/checkout — embedded mode", () => {
  it("creates an embedded session whose return_url is the guest /welcome flow", async () => {
    const res = await post({ plan: "weekly", ui: "embedded" });
    expect(res.status).toBe(200);
    // Embedded sessions answer with the client secret, never a hosted url.
    expect(await res.json()).toEqual({
      clientSecret: "cs_test_123_secret_xyz",
      metaEventId: expect.any(String),
    });
    const p = createdParams();
    expect(p.ui_mode).toBe("embedded");
    expect(p.redirect_on_completion).toBe("always");
    // Same placeholder /welcome + /api/checkout/complete already read.
    expect(p.return_url).toBe(
      "https://worldeye.app/welcome?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(p.success_url).toBeUndefined();
    expect(p.cancel_url).toBeUndefined();
  });

  it("preserves trial days per plan in embedded mode", async () => {
    for (const [plan, days] of [
      ["weekly", 3],
      ["monthly", 10],
      ["annual", 10],
    ] as const) {
      vi.clearAllMocks();
      await post({ plan, ui: "embedded" });
      const p = createdParams();
      expect(p.ui_mode).toBe("embedded");
      expect(p.subscription_data.trial_period_days).toBe(days);
      expect(p.payment_method_collection).toBe("always");
      expect(p.billing_address_collection).toBe("required");
    }
  });

  it("keeps enterprise trial-free in embedded mode", async () => {
    await post({ plan: "enterprise", ui: "embedded" });
    const p = createdParams();
    expect(p.ui_mode).toBe("embedded");
    expect(p.subscription_data.trial_period_days).toBeUndefined();
    expect(p.payment_method_collection).toBeUndefined();
    expect(p.billing_address_collection).toBe("required");
  });

  it("sends signed-in members to the app success target, not /welcome", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1", email: "a@b.c" } });
    const res = await post({ plan: "monthly", ui: "embedded" });
    expect(res.status).toBe(200);
    const p = createdParams();
    expect(p.return_url).toBe("https://worldeye.app/?checkout=success");
    expect(p.client_reference_id).toBe("user_1");
    expect(p.customer).toBe("cus_test_1");
  });
});

describe("POST /api/checkout — shared guards", () => {
  it("rejects unknown plans in both modes without touching Stripe", async () => {
    for (const body of [{ plan: "daily" }, { plan: "daily", ui: "embedded" }]) {
      const res = await post(body);
      expect(res.status).toBe(400);
    }
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("fails closed when the plan's price env is missing", async () => {
    delete process.env.STRIPE_WEEKLY_PRICE_ID;
    const res = await post({ plan: "weekly", ui: "embedded" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("STRIPE_WEEKLY_PRICE_ID");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/checkout — dedupe guard (Wave 2 F6)", () => {
  const member = () =>
    mocks.auth.mockResolvedValue({ user: { id: "user_1", email: "a@b.c" } });

  it("blocks members who already hold an active pass — 409 with the manage route (both modes)", async () => {
    member();
    mocks.findSubscription.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      stripeCustomerId: "cus_existing",
    });
    for (const body of [{ plan: "annual" }, { plan: "annual", ui: "embedded" }]) {
      const res = await post(body);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("already_subscribed");
      expect(data.manageUrl).toBe("/settings/subscription");
      expect(data.error).toContain("already have an active WorldEye plan");
    }
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("blocks members whose subscription is still trialing (the pre-F6 hole)", async () => {
    member();
    mocks.findSubscription.mockResolvedValue({
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      stripeCustomerId: "cus_existing",
    });
    const res = await post({ plan: "weekly" });
    expect(res.status).toBe(409);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("lets a lapsed member resubscribe on their known Stripe customer", async () => {
    member();
    mocks.findSubscription.mockResolvedValue({
      status: "canceled",
      currentPeriodEnd: new Date(Date.now() - 86_400_000),
      stripeCustomerId: "cus_existing",
    });
    const res = await post({ plan: "monthly" });
    expect(res.status).toBe(200);
    expect(createdParams().customer).toBe("cus_existing");
    expect(mocks.createCustomer).not.toHaveBeenCalled();
    expect(mocks.listCustomers).not.toHaveBeenCalled();
  });

  it("reuses the Stripe customer found by account email instead of creating a duplicate", async () => {
    member();
    mocks.listCustomers.mockResolvedValue({
      data: [{ id: "cus_found", metadata: { userId: "user_1" } }],
    });
    const res = await post({ plan: "monthly" });
    expect(res.status).toBe(200);
    expect(mocks.listCustomers).toHaveBeenCalledWith({ email: "a@b.c", limit: 10 });
    expect(createdParams().customer).toBe("cus_found");
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it("blocks when a live subscription exists under the account email but no DB row", async () => {
    member();
    mocks.listCustomers.mockResolvedValue({
      data: [{ id: "cus_guest", metadata: {} }],
    });
    mocks.listSubscriptions.mockResolvedValue({ data: [{ status: "trialing" }] });
    const res = await post({ plan: "monthly" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("already_subscribed");
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it("fails open to a fresh customer when the email lookup throws", async () => {
    member();
    mocks.listCustomers.mockRejectedValue(new Error("stripe down"));
    const res = await post({ plan: "monthly" });
    expect(res.status).toBe(200);
    expect(mocks.createCustomer).toHaveBeenCalledTimes(1);
    expect(createdParams().customer).toBe("cus_test_1");
  });
});
