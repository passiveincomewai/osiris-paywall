// Stripe webhook — gift subscription fulfilment.
// Handler-level, Stripe / Prisma faked in memory in the same harness
// style as route.powder-pass.test.ts. Pins:
//   - a paid gift checkout flips the gift pending → paid exactly
//     once, stores the Stripe sub + paid period, sets
//     cancel_at_period_end (one prepaid term, no renewal charge),
//     and emails the RECIPIENT a redemption link;
//   - NO entitlement Subscription row is ever written for a gift —
//     the buyer bought access for someone else;
//   - a Stripe replay of the same event is a no-op (no second
//     email, no second Stripe update);
//   - an unpaid session does not fulfil;
//   - gift subscription lifecycle events (updated/deleted) never
//     reach the entitlement writer (syncSubscription gift guard).
// Run: npx vitest run src/app/api/webhooks/stripe/route.gift.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, any>;

const H = vi.hoisted(() => {
  const PERIOD_START = 1793400000; // 2026-10-31T02:40:00Z
  const PERIOD_END = 1795992000; //   2026-11-30T02:40:00Z
  const store: { users: Row[]; subscriptions: Row[]; gifts: Row[] } = {
    users: [],
    subscriptions: [],
    gifts: [],
  };

  const sendEmailMock = vi.fn(async () => true);
  const subUpdateMock = vi.fn(async (_id: string, _params: Row) => ({}));

  const giftSub: Row = {
    id: "sub_gift_1",
    customer: "cus_buyer",
    status: "active",
    cancel_at_period_end: false,
    metadata: { gift: "1", giftId: "gift_1" },
    items: {
      data: [
        {
          price: { id: "price_pro_monthly" },
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
        },
      ],
    },
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
      upsert: async ({ where, create }: any) => {
        const row = { id: `subrow_${store.subscriptions.length + 1}`, ...create };
        store.subscriptions.push(row);
        return row;
      },
      delete: async () => null,
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
    giftSubscription: {
      findUnique: async ({ where }: any) =>
        store.gifts.find(
          (g) =>
            (where.id && g.id === where.id) || (where.code && g.code === where.code),
        ) ?? null,
      updateMany: async ({ where, data }: any) => {
        const g = store.gifts.find(
          (x) => x.id === where.id && (where.status === undefined || x.status === where.status),
        );
        if (!g) return { count: 0 };
        Object.assign(g, data);
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        const g = store.gifts.find((x) => x.id === where.id);
        if (g) Object.assign(g, data);
        return g ?? null;
      },
    },
    organization: { findUnique: async () => null },
    teamPricingConfig: { findUnique: async () => null },
    checkoutAttempt: {
      upsert: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  };

  const stripeFake: Row = {
    event: null as Row | null,
    webhooks: {
      constructEvent: () => {
        if (!stripeFake.event) throw new Error("no event staged");
        return stripeFake.event;
      },
    },
    subscriptions: {
      retrieve: async () => giftSub,
      update: subUpdateMock,
      cancel: vi.fn(async () => ({})),
    },
    customers: {
      retrieve: async () => ({
        id: "cus_buyer",
        email: "buyer@example.com",
        name: "Buyer Example",
        deleted: false,
      }),
    },
    invoices: { list: async () => ({ data: [] }) },
    checkout: { sessions: { list: async () => ({ data: [] }) } },
  };

  return { store, db, stripeFake, sendEmailMock, subUpdateMock, giftSub, PERIOD_START, PERIOD_END };
});

vi.mock("@/lib/db", () => ({ db: H.db }));
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

function seedGift(overrides: Row = {}) {
  H.store.gifts = [
    {
      id: "gift_1",
      code: "GIFTCODESENTINEMAIL",
      buyerUserId: null,
      buyerEmail: "buyer@example.com",
      recipientEmail: "friend@example.com",
      planKey: "pro_monthly",
      stripePriceId: "price_pro_monthly",
      status: "pending",
      stripeCheckoutSessionId: "cs_gift_1",
      stripeSubscriptionId: null,
      periodStart: null,
      periodEnd: null,
      redeemedByUserId: null,
      redeemedAt: null,
      ...overrides,
    },
  ];
}

function stageGiftCompleted(overrides: Row = {}) {
  H.stripeFake.event = {
    id: "evt_gift_1",
    type: "checkout.session.completed",
    livemode: true,
    data: {
      object: {
        id: "cs_gift_1",
        mode: "subscription",
        payment_status: "paid",
        subscription: "sub_gift_1",
        metadata: { kind: "gift", giftId: "gift_1" },
        customer_details: { email: "buyer@example.com" },
        discounts: [],
        ...overrides,
      },
    },
  };
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
  H.store.gifts = [];
  H.stripeFake.event = null;
  H.sendEmailMock.mockClear();
  H.subUpdateMock.mockClear();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  delete process.env.STRIPE_LIVE_MODE;
});

describe("gift checkout.session.completed", () => {
  it("fulfils the gift: paid, period stored, renewal cancelled, recipient emailed, NO entitlement row", async () => {
    seedGift();
    stageGiftCompleted();
    const res = await postEvent();
    expect(res.status).toBe(200);

    const gift = H.store.gifts[0];
    expect(gift.status).toBe("paid");
    expect(gift.stripeSubscriptionId).toBe("sub_gift_1");
    expect(gift.periodStart.getTime()).toBe(H.PERIOD_START * 1000);
    expect(gift.periodEnd.getTime()).toBe(H.PERIOD_END * 1000);

    // One prepaid term: the buyer's card is never renewal-charged.
    expect(H.subUpdateMock).toHaveBeenCalledTimes(1);
    expect(H.subUpdateMock).toHaveBeenCalledWith("sub_gift_1", {
      cancel_at_period_end: true,
    });

    // The recipient — not the buyer — gets the redemption email.
    expect(H.sendEmailMock).toHaveBeenCalledTimes(1);
    const [to, , html] = H.sendEmailMock.mock.calls[0] as any[];
    expect(to).toBe("friend@example.com");
    expect(html).toContain("/gift/redeem?code=GIFTCODESENTINEMAIL");

    // The buyer gains NO plan from buying a gift.
    expect(H.store.subscriptions).toHaveLength(0);
  });

  it("is a no-op on Stripe replay: no second email, no second Stripe update", async () => {
    seedGift();
    stageGiftCompleted();
    await postEvent();
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.sendEmailMock).toHaveBeenCalledTimes(1);
    expect(H.subUpdateMock).toHaveBeenCalledTimes(1);
    expect(H.store.gifts[0].status).toBe("paid");
    expect(H.store.subscriptions).toHaveLength(0);
  });

  it("does not fulfil an unpaid session", async () => {
    seedGift();
    stageGiftCompleted({ payment_status: "unpaid" });
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.store.gifts[0].status).toBe("pending");
    expect(H.sendEmailMock).not.toHaveBeenCalled();
    expect(H.subUpdateMock).not.toHaveBeenCalled();
  });
});

describe("gift subscription lifecycle events", () => {
  it("never write an entitlement row (syncSubscription gift guard)", async () => {
    seedGift({ status: "paid", stripeSubscriptionId: "sub_gift_1" });
    H.stripeFake.event = {
      id: "evt_gift_2",
      type: "customer.subscription.updated",
      livemode: true,
      data: { object: H.giftSub },
    };
    const res = await postEvent();
    expect(res.status).toBe(200);
    expect(H.store.subscriptions).toHaveLength(0);
    expect(H.store.users).toHaveLength(0);
  });
});
