// GET /api/billing/past-due — banner state route tests (mocked
// auth / Prisma / Stripe). The route must only ever describe the
// CALLER's own subscription (user id from the session), and must
// answer { pastDue: false } for everyone else.
// Run: npx vitest run src/app/api/billing/past-due/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, any>;

const H = vi.hoisted(() => {
  const store: { subscriptions: Row[] } = { subscriptions: [] };
  const authMock = vi.fn(async () => null as Row | null);
  const invoicesList = vi.fn(async () => ({ data: [] as Row[] }));
  const db = {
    subscription: {
      findUnique: async ({ where }: any) =>
        store.subscriptions.find((s) => s.userId === where.userId) ?? null,
    },
  };
  return { store, authMock, invoicesList, db };
});

vi.mock("@/auth", () => ({ auth: H.authMock }));
vi.mock("@/lib/db", () => ({ db: H.db }));
vi.mock("@/lib/stripe", () => ({
  appUrl: () => "https://worldeye.app",
  stripe: () => ({ invoices: { list: H.invoicesList } }),
}));

import { GET } from "./route";

function seedSub(status: string) {
  H.store.subscriptions = [
    {
      userId: "user-1",
      status,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    },
  ];
}

beforeEach(() => {
  H.store.subscriptions = [];
  H.authMock.mockReset();
  H.authMock.mockResolvedValue({ user: { id: "user-1" } });
  H.invoicesList.mockReset();
  H.invoicesList.mockResolvedValue({ data: [] });
});

describe("GET /api/billing/past-due", () => {
  it("401s when signed out", async () => {
    H.authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("answers pastDue:false for an active subscriber", async () => {
    seedSub("active");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pastDue: false });
    expect(H.invoicesList).not.toHaveBeenCalled();
  });

  it("returns the open invoice's pay/update target for a past_due subscriber", async () => {
    seedSub("past_due");
    H.invoicesList.mockResolvedValue({
      data: [
        {
          id: "in_1",
          amount_due: 1399,
          currency: "usd",
          hosted_invoice_url: "https://invoice.stripe.com/i/in_1",
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_1" },
          },
        },
      ],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      pastDue: true,
      invoiceId: "in_1",
      hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
      amountLabel: "$13.99",
    });
  });

  it("past_due with no resolvable invoice still reports pastDue with nulls", async () => {
    seedSub("past_due");
    const res = await GET();
    expect(await res.json()).toEqual({
      pastDue: true,
      invoiceId: null,
      hostedInvoiceUrl: null,
      amountLabel: null,
    });
  });
});
