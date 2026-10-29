// Stripe webhook — standalone-product yield rules (Powder Pass slice).
// Handler-level, with Stripe / Prisma faked in memory, in the same
// harness style as route.test.ts (the dunning suite). Pins the
// single-row slot rules in syncSubscription:
//   - a TIER sub syncing over a Powder Pass row cancels the ski sub
//     at Stripe and takes the slot (the Ambient yield rule, extended);
//   - a Powder Pass sub syncing over a tier row is a no-op — the
//     tier row wins and the ski sub never lands;
//   - a Powder Pass sub for a user with no row lands normally;
//   - the pre-existing Ambient yield still behaves exactly as before;
//   - a standalone swap (Ambient row, Powder Pass sub) cancels the
//     displaced sub and takes the slot.
// Run: npx vitest run src/app/api/webhooks/stripe/route.powder-pass.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, any>;

const AMBIENT_FALLBACK_PRICE = "price_1UUxUnGfHuTnzrlHH0pNYhJU";

const H = vi.hoisted(() => {
  const store: { users: Row[]; subscriptions: Row[] } = {
    users: [],
    subscriptions: [],
  };

  const db = {
    subscription: {
      findUnique: async ({ where }: any) => {
        if (where.stripeSubscriptionId) {
          return (
            store.subscriptions.find(
              (s) => s.stripeSubscriptionId === where.stripeSubscriptionId,
            ) ?? null
          );
        }
        if (where.userId) {
          return store.subscriptions.find((s) => s.userId === where.userId) ?? null;
        }
        return null;
      },
      upsert: async ({ where, create, update }: any) => {
        const i = store.subscriptions.findIndex(
          (s) => s.stripeSubscriptionId === where.stripeSubscriptionId,
        );
        if (i >= 0) {
          store.subscriptions[i] = { ...store.subscriptions[i], ...update };
          return store.subscriptions[i];
        }
        const row = { id: `subrow_${store.subscriptions.length + 1}`, ...create };
        store.subscriptions.push(row);
        return row;
      },
      delete: async ({ where }: any) => {
        const i = store.subscriptions.findIndex((s) => s.userId === where.userId);
        if (i >= 0) store.subscriptions.splice(i, 1);
        return null;
      },
    },
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id) return store.users.find((u) => u.id === where.id) ?? null;
        if (where.email) return store.users.find((u) => u.email === where.email) ?? null;
        return null;
      },
      create: async ({ data }: any) => {
        const row = { id: `user_${store.users.length + 1}`, ...data };
        store.users.push(row);
        return row;
      },
    },
    organization: { findUnique: async () => null },
    teamPricingConfig: { findUnique: async () => null },
    checkoutAttempt: {
      upsert: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  };

  const cancelMock = vi.fn(async (_id: string) => ({}));
  const stripeFake: Row = {
    event: null as Row | null,
    sub: null as Row | null,
    webhooks: {
      constructEvent: () => {
        if (!stripeFake.event) throw new Error("no event staged");
        return stripeFake.event;
      },
    },
    subscriptions: {
      retrieve: async () => stripeFake.sub,
      cancel: cancelMock,
    },
    customers: {
      retrieve: async () => ({
        id: "cus_1",
        email: "member@example.com",
        name: "Jamie Example",
        deleted: false,
      }),
    },
    invoices: { list: async () => ({ data: [] }) },
  };

  return { store, db, stripeFake, cancelMock };
});

vi.mock("@/lib/db", () => ({ db: H.db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/stripe", () => ({
  appUrl: () => "https://worldeye.app",
  stripe: () => H.stripeFake,
}));
vi.mock("@/lib/email", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/email")>();
  return { ...orig, sendEmail: vi.fn(async () => true), emailConfigured: () => true };
});

import { POST } from "./route";

function fakeSub(overrides: Row = {}): Row {
  return {
    id: "sub_new",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { userId: "user-1" },
    items: {
      data: [
        {
          price: { id: "price_annual" },
          current_period_start: 1760000000,
          current_period_end: 1762592000,
        },
      ],
    },
    ...overrides,
  };
}

function stageSubscriptionUpdated(sub: Row) {
  H.stripeFake.event = {
    id: "evt_1",
    type: "customer.subscription.updated",
    livemode: true,
    data: { object: sub },
  };
}

function seedRow(overrides: Row = {}) {
  H.store.users = [{ id: "user-1", email: "member@example.com", name: "Jamie Example" }];
  H.store.subscriptions = [
    {
      id: "subrow-1",
      userId: "user-1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_existing",
      stripePriceId: "price_ski",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 86400_000),
      cancelAtPeriodEnd: false,
      ...overrides,
    },
  ];
}

async function postEvent() {
  const req = new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "raw-body",
  });
  return POST(req);
}

beforeEach(() => {
  H.store.users = [];
  H.store.subscriptions = [];
  H.stripeFake.event = null;
  H.stripeFake.sub = null;
  H.cancelMock.mockClear();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.POWDER_PASS_PRICE_ID = "price_ski";
  delete process.env.STRIPE_LIVE_MODE;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("syncSubscription — Powder Pass yield rules", () => {
  it("tier-over-ski: an annual sub syncing over a Powder Pass row cancels the ski sub and takes the slot", async () => {
    seedRow();
    stageSubscriptionUpdated(fakeSub({ id: "sub_new" }));
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.cancelMock).toHaveBeenCalledTimes(1);
    expect(H.cancelMock).toHaveBeenCalledWith("sub_existing");
    expect(H.store.subscriptions).toHaveLength(1);
    expect(H.store.subscriptions[0]).toMatchObject({
      stripeSubscriptionId: "sub_new",
      stripePriceId: "price_annual",
      userId: "user-1",
    });
  });

  it("ski-over-tier: a Powder Pass sub syncing over a tier row is a no-op — the tier row wins", async () => {
    seedRow({ stripeSubscriptionId: "sub_tier", stripePriceId: "price_annual" });
    stageSubscriptionUpdated(
      fakeSub({
        id: "sub_ski_incoming",
        items: {
          data: [
            {
              price: { id: "price_ski" },
              current_period_start: 1760000000,
              current_period_end: 1762592000,
            },
          ],
        },
      }),
    );
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.cancelMock).not.toHaveBeenCalled();
    expect(H.store.subscriptions).toHaveLength(1);
    expect(H.store.subscriptions[0]).toMatchObject({
      stripeSubscriptionId: "sub_tier",
      stripePriceId: "price_annual",
    });
  });

  it("a Powder Pass sub for a user with no row lands normally", async () => {
    H.store.users = [{ id: "user-1", email: "member@example.com", name: "Jamie Example" }];
    stageSubscriptionUpdated(
      fakeSub({
        id: "sub_ski_new",
        items: {
          data: [
            {
              price: { id: "price_ski" },
              current_period_start: 1760000000,
              current_period_end: 1762592000,
            },
          ],
        },
      }),
    );
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.cancelMock).not.toHaveBeenCalled();
    expect(H.store.subscriptions).toHaveLength(1);
    expect(H.store.subscriptions[0]).toMatchObject({
      stripeSubscriptionId: "sub_ski_new",
      stripePriceId: "price_ski",
    });
  });

  it("ambient regression: a tier sub syncing over an Ambient row still cancels it (pre-ski behaviour)", async () => {
    seedRow({ stripePriceId: AMBIENT_FALLBACK_PRICE });
    stageSubscriptionUpdated(
      fakeSub({
        id: "sub_new",
        items: {
          data: [
            {
              price: { id: "price_monthly" },
              current_period_start: 1760000000,
              current_period_end: 1762592000,
            },
          ],
        },
      }),
    );
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.cancelMock).toHaveBeenCalledWith("sub_existing");
    expect(H.store.subscriptions).toHaveLength(1);
    expect(H.store.subscriptions[0]).toMatchObject({
      stripeSubscriptionId: "sub_new",
      stripePriceId: "price_monthly",
    });
  });

  it("standalone swap: a Powder Pass sub syncing over an Ambient row cancels the Ambient sub and takes the slot", async () => {
    seedRow({ stripePriceId: AMBIENT_FALLBACK_PRICE });
    stageSubscriptionUpdated(
      fakeSub({
        id: "sub_ski_incoming",
        items: {
          data: [
            {
              price: { id: "price_ski" },
              current_period_start: 1760000000,
              current_period_end: 1762592000,
            },
          ],
        },
      }),
    );
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.cancelMock).toHaveBeenCalledWith("sub_existing");
    expect(H.store.subscriptions).toHaveLength(1);
    expect(H.store.subscriptions[0]).toMatchObject({
      stripeSubscriptionId: "sub_ski_incoming",
      stripePriceId: "price_ski",
    });
  });
});
