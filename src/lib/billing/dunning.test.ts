// Failed-payment recovery (dunning) — unit tests with in-memory fakes.
// Pins the send discipline the webhook relies on: ONE recovery email
// per invoice per Stripe attempt (LifecycleEmailLog is the dedupe),
// owner/test inboxes never emailed, no hosted URL → no send, a failed
// send writes no log row so a later event can retry.
// Run: npx vitest run src/lib/billing/dunning.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

type Row = Record<string, any>;

const { store, db, sendEmailMock, emailConfiguredMock, stripeInvoicesList } =
  vi.hoisted(() => {
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
      },
      user: {
        findUnique: async ({ where }: any) => {
          if (where.id) return store.users.find((u) => u.id === where.id) ?? null;
          if (where.email) return store.users.find((u) => u.email === where.email) ?? null;
          return null;
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
    };

    const sendEmailMock = vi.fn(async () => true);
    const emailConfiguredMock = vi.fn(() => true);
    const stripeInvoicesList = vi.fn(async () => ({ data: [] as any[] }));
    return { store, db, sendEmailMock, emailConfiguredMock, stripeInvoicesList };
  });

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/email", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/email")>();
  return { ...orig, sendEmail: sendEmailMock, emailConfigured: emailConfiguredMock };
});
vi.mock("@/lib/stripe", () => ({
  appUrl: () => "https://worldeye.app",
  stripe: () => ({ invoices: { list: stripeInvoicesList } }),
}));

import {
  PAYMENT_RECOVERY_TEMPLATE,
  getPastDueState,
  recoveryContextKey,
  sendPaymentFailedRecovery,
  subscriptionIdFromInvoice,
} from "./dunning";

function seedUser(overrides: Row = {}) {
  const user = {
    id: "user-1",
    email: "member@example.com",
    name: "Jamie Example",
    ...overrides,
  };
  store.users = [user];
  store.subscriptions = [
    {
      id: "subrow-1",
      userId: user.id,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "past_due",
    },
  ];
  return user;
}

function fakeInvoice(overrides: Row = {}): Stripe.Invoice {
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
  } as unknown as Stripe.Invoice;
}

beforeEach(() => {
  store.users = [];
  store.subscriptions = [];
  store.logs = [];
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(true);
  emailConfiguredMock.mockReset();
  emailConfiguredMock.mockReturnValue(true);
  stripeInvoicesList.mockReset();
  stripeInvoicesList.mockResolvedValue({ data: [] });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("recoveryContextKey", () => {
  it("keys dedupe on invoice + attempt", () => {
    expect(recoveryContextKey("in_1", 1)).toBe("in_1:1");
    expect(recoveryContextKey("in_1", 3)).toBe("in_1:3");
  });
  it("clamps a missing/zero attempt to 1", () => {
    expect(recoveryContextKey("in_1", 0)).toBe("in_1:1");
    expect(recoveryContextKey("in_1", Number.NaN)).toBe("in_1:1");
  });
});

describe("subscriptionIdFromInvoice", () => {
  it("resolves the v18 parent.subscription_details path (id or object)", () => {
    expect(subscriptionIdFromInvoice(fakeInvoice())).toBe("sub_1");
    expect(
      subscriptionIdFromInvoice(
        fakeInvoice({
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: { id: "sub_9" } },
          },
        }),
      ),
    ).toBe("sub_9");
  });
  it("returns null without a subscription parent", () => {
    expect(subscriptionIdFromInvoice(fakeInvoice({ parent: null }))).toBeNull();
    expect(
      subscriptionIdFromInvoice(fakeInvoice({ parent: { type: "quote_details" } })),
    ).toBeNull();
  });
});

describe("sendPaymentFailedRecovery", () => {
  it("sends one recovery email with the hosted invoice link + billing page, and logs it", async () => {
    seedUser();
    const result = await sendPaymentFailedRecovery(fakeInvoice());
    expect(result).toEqual({ sent: true, userId: "user-1", contextKey: "in_1:1" });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [to, subject, html] = sendEmailMock.mock.calls[0] as unknown as [string, string, string];
    expect(to).toBe("member@example.com");
    expect(subject).toContain("payment");
    expect(html).toContain("https://invoice.stripe.com/i/in_1");
    expect(html).toContain("https://worldeye.app/settings/subscription");
    expect(html).toContain("$74.99");
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({
      userId: "user-1",
      recipientEmail: "member@example.com",
      template: PAYMENT_RECOVERY_TEMPLATE,
      contextKey: "in_1:1",
      kind: "transactional",
      status: "sent",
    });
  });

  it("dedupes a replayed event for the same attempt", async () => {
    seedUser();
    await sendPaymentFailedRecovery(fakeInvoice());
    const replay = await sendPaymentFailedRecovery(fakeInvoice());
    expect(replay).toEqual({ sent: false, reason: "already_sent" });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(store.logs).toHaveLength(1);
  });

  it("sends a fresh email on the next Stripe attempt", async () => {
    seedUser();
    await sendPaymentFailedRecovery(fakeInvoice());
    const second = await sendPaymentFailedRecovery(fakeInvoice({ attempt_count: 2 }));
    expect(second).toEqual({ sent: true, userId: "user-1", contextKey: "in_1:2" });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(store.logs.map((l) => l.contextKey)).toEqual(["in_1:1", "in_1:2"]);
  });

  it.each([
    "theboodirectory@gmail.com",
    "jamesonlythgoe@gmail.com",
    "passiveincomewai@gmail.com",
    "xfueltests@gmail.com",
    "xfuelmarketing@gmail.com",
  ])("never emails owner/test inbox %s", async (email) => {
    seedUser({ email });
    const result = await sendPaymentFailedRecovery(fakeInvoice());
    expect(result).toEqual({ sent: false, reason: "excluded_recipient" });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(store.logs).toHaveLength(0);
  });

  it("skips when the invoice has no hosted URL", async () => {
    seedUser();
    const result = await sendPaymentFailedRecovery(
      fakeInvoice({ hosted_invoice_url: null }),
    );
    expect(result).toEqual({ sent: false, reason: "no_hosted_url" });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(store.logs).toHaveLength(0);
  });

  it("skips non-subscription invoices and unknown subscriptions", async () => {
    seedUser();
    expect(
      await sendPaymentFailedRecovery(fakeInvoice({ parent: null })),
    ).toEqual({ sent: false, reason: "not_subscription_invoice" });
    expect(
      await sendPaymentFailedRecovery(
        fakeInvoice({
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_unknown" },
          },
        }),
      ),
    ).toEqual({ sent: false, reason: "no_subscription_row" });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("writes no log row when the send fails, so a later event can retry", async () => {
    seedUser();
    sendEmailMock.mockResolvedValue(false);
    expect(await sendPaymentFailedRecovery(fakeInvoice())).toEqual({
      sent: false,
      reason: "send_failed",
    });
    expect(store.logs).toHaveLength(0);
    sendEmailMock.mockResolvedValue(true);
    expect(await sendPaymentFailedRecovery(fakeInvoice())).toMatchObject({ sent: true });
    expect(store.logs).toHaveLength(1);
  });

  it("skips when email is not configured", async () => {
    seedUser();
    emailConfiguredMock.mockReturnValue(false);
    expect(await sendPaymentFailedRecovery(fakeInvoice())).toEqual({
      sent: false,
      reason: "email_not_configured",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("mentions the next automatic retry date when Stripe provides one", async () => {
    seedUser();
    const next = Math.floor(new Date("2026-10-27T05:11:00Z").getTime() / 1000);
    await sendPaymentFailedRecovery(fakeInvoice({ next_payment_attempt: next }));
    const html = (sendEmailMock.mock.calls[0] as unknown as [string, string, string])[2];
    expect(html).toContain("October 27, 2026");
  });
});

describe("getPastDueState", () => {
  it("returns null when the subscription is not past_due", async () => {
    seedUser();
    store.subscriptions[0].status = "active";
    expect(await getPastDueState("user-1")).toBeNull();
  });

  it("resolves the open invoice for the user's own subscription", async () => {
    seedUser();
    stripeInvoicesList.mockResolvedValue({
      data: [
        fakeInvoice({
          id: "in_other",
          hosted_invoice_url: "https://invoice.stripe.com/i/in_other",
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_other" },
          },
        }),
        fakeInvoice(),
      ],
    });
    expect(await getPastDueState("user-1")).toEqual({
      invoiceId: "in_1",
      hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
      amountLabel: "$74.99",
    });
  });

  it("degrades to the generic state when Stripe fails or no invoice matches", async () => {
    seedUser();
    stripeInvoicesList.mockRejectedValue(new Error("stripe down"));
    expect(await getPastDueState("user-1")).toEqual({
      invoiceId: null,
      hostedInvoiceUrl: null,
      amountLabel: null,
    });
    stripeInvoicesList.mockResolvedValue({ data: [] });
    expect(await getPastDueState("user-1")).toEqual({
      invoiceId: null,
      hostedInvoiceUrl: null,
      amountLabel: null,
    });
  });
});
