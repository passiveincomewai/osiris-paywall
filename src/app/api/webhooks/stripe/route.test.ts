// Stripe webhook — invoice.payment_failed dunning tests.
// Handler-level, with Stripe / Prisma / the mailer all faked in memory.
// Pins: on a failed subscription invoice the customer gets ONE
// recovery email per payment attempt (replays deduped via
// LifecycleEmailLog), owner/test inboxes are never emailed, and an
// invoice without a hosted URL sends nothing — while the webhook
// still answers 200 and the subscription sync still lands past_due.
// Run: npx vitest run src/app/api/webhooks/stripe/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, any>;

const H = vi.hoisted(() => {
  const store: { users: Row[]; subscriptions: Row[]; logs: Row[] } = {
    users: [],
    subscriptions: [],
    logs: [],
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
    lifecycleEmailLog: {
      findUnique: async ({ where }: any) => {
        const c = where.userId_template_contextKey;
        return (
          store.logs.find(
            (l) =>
              l.userId === c.userId &&
              l.template === c.template &&
              l.contextKey === c.contextKey,
          ) ?? null
        );
      },
      create: async ({ data }: any) => {
        const dupe = store.logs.find(
          (l) =>
            l.userId === data.userId &&
            l.template === data.template &&
            l.contextKey === data.contextKey,
        );
        if (dupe) throw new Error("P2002: unique constraint failed");
        const row = { id: `log_${store.logs.length + 1}`, createdAt: new Date(), ...data };
        store.logs.push(row);
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

  const sendEmailMock = vi.fn(async () => true);

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

  return { store, db, sendEmailMock, stripeFake };
});

vi.mock("@/lib/db", () => ({ db: H.db }));
// A transitive import reaches @/auth (next-auth); the webhook never
// uses it, and loading next-auth under vitest breaks on next/server.
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/stripe", () => ({
  appUrl: () => "https://worldeye.app",
  stripe: () => H.stripeFake,
}));
vi.mock("@/lib/email", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/email")>();
  return { ...orig, sendEmail: H.sendEmailMock, emailConfigured: () => true };
});

import { POST } from "./route";

function fakeInvoice(overrides: Row = {}): Row {
  return {
    id: "in_1",
    customer: "cus_1",
    amount_due: 7499,
    currency: "usd",
    attempt_count: 1,
    hosted_invoice_url: "https://invoice.stripe.com/i/in_1",
    next_payment_attempt: null,
    parent: {
      type: "subscription_details",
      subscription_details: { subscription: "sub_1" },
    },
    ...overrides,
  };
}

function stagePaymentFailed(invoiceOverrides: Row = {}) {
  H.stripeFake.event = {
    id: "evt_1",
    type: "invoice.payment_failed",
    livemode: true,
    data: { object: fakeInvoice(invoiceOverrides) },
  };
  H.stripeFake.sub = {
    id: "sub_1",
    customer: "cus_1",
    status: "past_due",
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
  };
}

function seedMember(email = "member@example.com") {
  H.store.users = [{ id: "user-1", email, name: "Jamie Example" }];
  H.store.subscriptions = [
    {
      id: "subrow-1",
      userId: "user-1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_annual",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 86400_000),
      cancelAtPeriodEnd: false,
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
  H.store.logs = [];
  H.stripeFake.event = null;
  H.stripeFake.sub = null;
  H.sendEmailMock.mockReset();
  H.sendEmailMock.mockResolvedValue(true);
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  delete process.env.STRIPE_LIVE_MODE;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("invoice.payment_failed dunning", () => {
  it("emails the customer a recovery link once and syncs the sub to past_due", async () => {
    seedMember();
    stagePaymentFailed();
    const res = await postEvent();
    expect(res.status).toBe(200);

    // The pre-existing behavior stands: status synced from Stripe.
    expect(H.store.subscriptions[0].status).toBe("past_due");

    expect(H.sendEmailMock).toHaveBeenCalledTimes(1);
    const [to, , html] = H.sendEmailMock.mock.calls[0] as unknown as [string, string, string];
    expect(to).toBe("member@example.com");
    expect(html).toContain("https://invoice.stripe.com/i/in_1");
    expect(html).toContain("https://worldeye.app/settings/subscription");
    expect(H.store.logs).toHaveLength(1);
    expect(H.store.logs[0]).toMatchObject({
      template: "payment_failed_recovery",
      contextKey: "in_1:1",
      kind: "transactional",
    });
  });

  it("does not re-send when Stripe replays the same event", async () => {
    seedMember();
    stagePaymentFailed();
    await postEvent();
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.sendEmailMock).toHaveBeenCalledTimes(1);
    expect(H.store.logs).toHaveLength(1);
  });

  it("sends a fresh email when the next attempt fails", async () => {
    seedMember();
    stagePaymentFailed();
    await postEvent();
    stagePaymentFailed({ attempt_count: 2 });
    await postEvent();
    expect(H.sendEmailMock).toHaveBeenCalledTimes(2);
    expect(H.store.logs.map((l) => l.contextKey)).toEqual(["in_1:1", "in_1:2"]);
  });

  it.each(["theboodirectory@gmail.com", "passiveincomewai@gmail.com"])(
    "never emails owner/test inbox %s",
    async (email) => {
      seedMember(email);
      stagePaymentFailed();
      const res = await postEvent();
      expect(res.status).toBe(200);
      expect(H.sendEmailMock).not.toHaveBeenCalled();
      expect(H.store.logs).toHaveLength(0);
    },
  );

  it("sends nothing when the invoice has no hosted URL, but still syncs + 200s", async () => {
    seedMember();
    stagePaymentFailed({ hosted_invoice_url: null });
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.store.subscriptions[0].status).toBe("past_due");
    expect(H.sendEmailMock).not.toHaveBeenCalled();
    expect(H.store.logs).toHaveLength(0);
  });

  it("200s without sending for an invoice with no subscription parent", async () => {
    seedMember();
    stagePaymentFailed({ parent: null });
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.sendEmailMock).not.toHaveBeenCalled();
  });
});
