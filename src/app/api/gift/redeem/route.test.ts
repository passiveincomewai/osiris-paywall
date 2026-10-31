// Gift redemption route — POST /api/gift/redeem.
// Prisma / Auth faked in memory. Pins the claim flow end to end:
//   - a paid, in-term gift redeems into a Subscription row carrying
//     synthetic gift ids, the REAL gifted price id, and exactly the
//     gift's paid period;
//   - DOUBLE REDEMPTION is refused (409 already_redeemed) and the
//     second attempt changes nothing;
//   - a signed-in non-recipient is refused (403) and the gift is
//     NOT consumed;
//   - a recipient with live access is refused (409
//     already_subscribed), their real row untouched, gift NOT
//     consumed;
//   - signed-out is 401; the whole route 404s while
//     GIFT_SUBSCRIPTIONS_ENABLED is off.
// Run: npx vitest run src/app/api/gift/redeem/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, any>;

const PERIOD_START = new Date("2026-10-31T02:40:00Z");
const PERIOD_END = new Date("2026-11-30T02:40:00Z");

const H = vi.hoisted(() => {
  const store: { subscriptions: Row[]; gifts: Row[] } = {
    subscriptions: [],
    gifts: [],
  };
  const session: { current: Row | null } = { current: null };

  const db: Row = {
    giftSubscription: {
      findUnique: async ({ where }: any) =>
        store.gifts.find((g) => where.code && g.code === where.code) ?? null,
      updateMany: async ({ where, data }: any) => {
        const g = store.gifts.find(
          (x) => x.id === where.id && (where.status === undefined || x.status === where.status),
        );
        if (!g) return { count: 0 };
        Object.assign(g, data);
        return { count: 1 };
      },
    },
    subscription: {
      findUnique: async ({ where }: any) =>
        store.subscriptions.find((s) => s.userId === where.userId) ?? null,
      delete: async ({ where }: any) => {
        const i = store.subscriptions.findIndex((s) => s.userId === where.userId);
        if (i >= 0) store.subscriptions.splice(i, 1);
        return null;
      },
      create: async ({ data }: any) => {
        const row = { id: `subrow_${store.subscriptions.length + 1}`, ...data };
        store.subscriptions.push(row);
        return row;
      },
    },
    $transaction: async (fn: any) => fn(db),
  };

  return { store, db, session };
});

vi.mock("@/lib/db", () => ({ db: H.db }));
vi.mock("@/auth", () => ({ auth: async () => H.session.current }));

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
      status: "paid",
      stripeCheckoutSessionId: "cs_gift_1",
      stripeSubscriptionId: "sub_gift_1",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      redeemedByUserId: null,
      redeemedAt: null,
      ...overrides,
    },
  ];
}

function signInAs(email: string, id = "user_friend") {
  H.session.current = { user: { id, email } };
}

async function postRedeem(code = "GIFTCODESENTINEMAIL") {
  const req = new NextRequest("http://localhost/api/gift/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return POST(req);
}

beforeEach(() => {
  H.store.subscriptions = [];
  H.store.gifts = [];
  H.session.current = null;
  process.env.GIFT_SUBSCRIPTIONS_ENABLED = "1";
});

describe("POST /api/gift/redeem", () => {
  it("grants the gift: row carries gift ids, the real price id, and the exact paid period", async () => {
    seedGift();
    signInAs("friend@example.com");
    const res = await postRedeem();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.planDisplayName).toBe("Monthly");

    const gift = H.store.gifts[0];
    expect(gift.status).toBe("redeemed");
    expect(gift.redeemedByUserId).toBe("user_friend");
    expect(gift.redeemedAt).toBeInstanceOf(Date);

    expect(H.store.subscriptions).toHaveLength(1);
    const row = H.store.subscriptions[0];
    expect(row.userId).toBe("user_friend");
    expect(row.stripeSubscriptionId).toBe("gift_gift_1");
    expect(row.stripeCustomerId).toBe("gift_gift_1");
    expect(row.stripePriceId).toBe("price_pro_monthly");
    expect(row.status).toBe("active");
    expect(row.currentPeriodStart.getTime()).toBe(PERIOD_START.getTime());
    expect(row.currentPeriodEnd.getTime()).toBe(PERIOD_END.getTime());
  });

  it("refuses a DOUBLE redemption: 409, no second row, redemption record unchanged", async () => {
    seedGift();
    signInAs("friend@example.com");
    const first = await postRedeem();
    expect(first.status).toBe(200);
    const redeemedAt = H.store.gifts[0].redeemedAt;

    const second = await postRedeem();
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.code).toBe("already_redeemed");
    expect(H.store.subscriptions).toHaveLength(1);
    expect(H.store.gifts[0].redeemedAt).toBe(redeemedAt);
  });

  it("refuses a signed-in non-recipient (403) without consuming the gift", async () => {
    seedGift();
    signInAs("someoneelse@example.com", "user_other");
    const res = await postRedeem();
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("email_mismatch");
    expect(H.store.gifts[0].status).toBe("paid");
    expect(H.store.subscriptions).toHaveLength(0);
  });

  it("refuses when the recipient already has live access (409) — real row and gift untouched", async () => {
    seedGift();
    signInAs("friend@example.com");
    H.store.subscriptions = [
      {
        id: "subrow_real",
        userId: "user_friend",
        stripeCustomerId: "cus_real",
        stripeSubscriptionId: "sub_real",
        stripePriceId: "price_pro_annual",
        status: "active",
        currentPeriodStart: new Date("2026-10-01T00:00:00Z"),
        currentPeriodEnd: new Date("2027-10-01T00:00:00Z"),
        cancelAtPeriodEnd: false,
      },
    ];
    const res = await postRedeem();
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("already_subscribed");
    expect(H.store.gifts[0].status).toBe("paid");
    expect(H.store.subscriptions).toHaveLength(1);
    expect(H.store.subscriptions[0].stripeSubscriptionId).toBe("sub_real");
  });

  it("refuses an unknown code (404) and an unpaid gift (400)", async () => {
    seedGift();
    signInAs("friend@example.com");
    expect((await postRedeem("NOSUCHCODE")).status).toBe(404);

    seedGift({ status: "pending", periodStart: null, periodEnd: null });
    const res = await postRedeem();
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("unpaid");
  });

  it("requires sign-in (401)", async () => {
    seedGift();
    const res = await postRedeem();
    expect(res.status).toBe(401);
  });

  it("404s while the launch flag is off", async () => {
    delete process.env.GIFT_SUBSCRIPTIONS_ENABLED;
    seedGift();
    signInAs("friend@example.com");
    const res = await postRedeem();
    expect(res.status).toBe(404);
    expect(H.store.gifts[0].status).toBe("paid");
  });
});
