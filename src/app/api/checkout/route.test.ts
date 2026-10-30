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

describe("POST /api/checkout — Powder Pass plan (dark launch)", () => {
  beforeEach(() => {
    delete process.env.POWDER_PASS_ENABLED;
    delete process.env.POWDER_PASS_PRICE_ID;
  });
  afterEach(() => {
    delete process.env.POWDER_PASS_ENABLED;
    delete process.env.POWDER_PASS_PRICE_ID;
  });

  it("treats plan 'ski' as unknown while POWDER_PASS_ENABLED is off — even with a price set", async () => {
    process.env.POWDER_PASS_PRICE_ID = "price_ski";
    for (const body of [{ plan: "ski" }, { plan: "ski", ui: "embedded" }]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Unknown plan");
    }
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("fails closed with the standard not-configured error when the flag is on but the price env is missing", async () => {
    process.env.POWDER_PASS_ENABLED = "1";
    const res = await post({ plan: "ski" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("POWDER_PASS_PRICE_ID");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("creates a guest ski session with the trials config when lit: env price, 10-day trial, generic landing", async () => {
    process.env.POWDER_PASS_ENABLED = "1";
    process.env.POWDER_PASS_PRICE_ID = "price_ski";
    const res = await post({ plan: "ski" });
    expect(res.status).toBe(200);
    const p = createdParams();
    expect(p.mode).toBe("subscription");
    expect(p.line_items).toEqual([{ price: "price_ski", quantity: 1 }]);
    expect(p.metadata).toEqual({ plan: "ski" });
    expect(p.subscription_data.trial_period_days).toBe(10);
    expect(p.payment_method_collection).toBe("always");
    // No Powder Pass landing page exists until launch — the generic
    // guest/member targets apply.
    expect(p.success_url).toBe(
      "https://worldeye.app/welcome?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(p.cancel_url).toBe("https://worldeye.app/pricing?checkout=cancelled");
  });

  it("sends signed-in ski buyers to the app success target, not a ski page", async () => {
    process.env.POWDER_PASS_ENABLED = "1";
    process.env.POWDER_PASS_PRICE_ID = "price_ski";
    mocks.auth.mockResolvedValue({ user: { id: "user_1", email: "a@b.c" } });
    const res = await post({ plan: "ski" });
    expect(res.status).toBe(200);
    expect(createdParams().success_url).toBe("https://worldeye.app/?checkout=success");
  });

  it("lets a ski-only member upgrade to a tier on the same customer (guard carve-out wiring)", async () => {
    process.env.POWDER_PASS_ENABLED = "1";
    process.env.POWDER_PASS_PRICE_ID = "price_ski";
    mocks.auth.mockResolvedValue({ user: { id: "user_1", email: "a@b.c" } });
    mocks.findSubscription.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      stripeCustomerId: "cus_existing",
      stripePriceId: "price_ski",
    });
    const res = await post({ plan: "annual" });
    expect(res.status).toBe(200);
    expect(createdParams().customer).toBe("cus_existing");
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it("blocks a ski-only member re-buying ski (409, the duplicate wall)", async () => {
    process.env.POWDER_PASS_ENABLED = "1";
    process.env.POWDER_PASS_PRICE_ID = "price_ski";
    mocks.auth.mockResolvedValue({ user: { id: "user_1", email: "a@b.c" } });
    mocks.findSubscription.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      stripeCustomerId: "cus_existing",
      stripePriceId: "price_ski",
    });
    const res = await post({ plan: "ski" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("already_subscribed");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/checkout — Lite/Ultra grid plans (Phase B)", () => {
  const GRID_ENV: Record<string, string> = {
    STRIPE_LITE_WEEKLY_PRICE_ID: "price_lite_w",
    STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_m",
    STRIPE_LITE_ANNUAL_PRICE_ID: "price_lite_a",
    STRIPE_ULTRA_WEEKLY_PRICE_ID: "price_ultra_w",
    STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_ultra_m",
    STRIPE_ULTRA_ANNUAL_PRICE_ID: "price_ultra_a",
  };
  beforeEach(() => {
    Object.assign(process.env, GRID_ENV);
  });
  afterEach(() => {
    for (const k of Object.keys(GRID_ENV)) delete process.env[k];
  });

  it("resolves every one of the 9 grid plans from its own env price", async () => {
    const grid: Array<[string, string]> = [
      ["lite_weekly", "price_lite_w"],
      ["lite_monthly", "price_lite_m"],
      ["lite_annual", "price_lite_a"],
      ["weekly", "price_weekly"],
      ["monthly", "price_monthly"],
      ["annual", "price_annual"],
      ["ultra_weekly", "price_ultra_w"],
      ["ultra_monthly", "price_ultra_m"],
      ["ultra_annual", "price_ultra_a"],
    ];
    for (const [plan, price] of grid) {
      vi.clearAllMocks();
      const res = await post({ plan });
      expect(res.status).toBe(200);
      const p = createdParams();
      expect(p.line_items).toEqual([{ price, quantity: 1 }]);
      expect(p.metadata).toEqual({ plan });
    }
  });

  it("applies trial days by PERIOD for every tier: weekly 3, monthly 10, annual 10", async () => {
    for (const [plan, days] of [
      ["lite_weekly", 3],
      ["lite_monthly", 10],
      ["lite_annual", 10],
      ["ultra_weekly", 3],
      ["ultra_monthly", 10],
      ["ultra_annual", 10],
    ] as const) {
      vi.clearAllMocks();
      await post({ plan });
      const p = createdParams();
      expect(p.subscription_data.trial_period_days).toBe(days);
      expect(p.payment_method_collection).toBe("always");
    }
  });

  it("keeps promotion codes enabled on Lite and Ultra sessions (the WELCOME50 path is plan-agnostic)", async () => {
    for (const plan of ["lite_monthly", "ultra_annual"] as const) {
      vi.clearAllMocks();
      await post({ plan });
      expect(createdParams().allow_promotion_codes).toBe(true);
    }
  });

  it("serves the embedded flow for a grid plan (client secret, same trial)", async () => {
    const res = await post({ plan: "lite_annual", ui: "embedded" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      clientSecret: "cs_test_123_secret_xyz",
      metaEventId: expect.any(String),
    });
    const p = createdParams();
    expect(p.ui_mode).toBe("embedded");
    expect(p.line_items).toEqual([{ price: "price_lite_a", quantity: 1 }]);
    expect(p.subscription_data.trial_period_days).toBe(10);
  });

  it("fails SAFE with the existing error shape when a Lite/Ultra price env is unset — never a wrong price", async () => {
    delete process.env.STRIPE_LITE_MONTHLY_PRICE_ID;
    const res = await post({ plan: "lite_monthly" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("STRIPE_LITE_MONTHLY_PRICE_ID is not set");
    expect(mocks.createSession).not.toHaveBeenCalled();

    delete process.env.STRIPE_ULTRA_WEEKLY_PRICE_ID;
    const res2 = await post({ plan: "ultra_weekly", ui: "embedded" });
    expect(res2.status).toBe(500);
    expect((await res2.json()).error).toBe("STRIPE_ULTRA_WEEKLY_PRICE_ID is not set");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("blocks a member holding a Lite plan from checking out Ultra — 409 with the manage route", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1", email: "a@b.c" } });
    mocks.findSubscription.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
      stripeCustomerId: "cus_existing",
      stripePriceId: "price_lite_m",
    });
    const res = await post({ plan: "ultra_monthly" });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("already_subscribed");
    expect(data.manageUrl).toBe("/settings/subscription");
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
