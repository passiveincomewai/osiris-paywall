// Decision-table pins for the checkout dedupe guard (Wave 2 F6).
// The route test pins the wiring (409 shape, session params); these pin
// the decisions themselves against fake Stripe ports — including the
// two cases the pre-F6 route got wrong: a trialing member re-checking
// out, and a live plan held under the account email with no DB row.
import { describe, it, expect, vi } from "vitest";
import {
  resolveCheckoutGuard,
  dbSubscriptionIsLive,
  type CheckoutGuardPorts,
  type GuardDbSubscription,
  type GuardStripeCustomer,
} from "./checkout-guard";

const NOW = new Date("2026-10-23T12:00:00.000Z");
const FUTURE = new Date("2026-11-23T12:00:00.000Z");
const PAST = new Date("2026-09-23T12:00:00.000Z");

function ports(overrides: Partial<CheckoutGuardPorts> = {}): CheckoutGuardPorts {
  return {
    listCustomersByEmail: vi.fn(async () => []),
    listCustomerSubscriptions: vi.fn(async () => []),
    ...overrides,
  };
}

const dbSub = (over: Partial<GuardDbSubscription> = {}): GuardDbSubscription => ({
  status: "canceled",
  currentPeriodEnd: PAST,
  stripeCustomerId: "cus_db",
  ...over,
});

const base = { userId: "user_1", email: "a@b.c", now: NOW };

describe("dbSubscriptionIsLive", () => {
  it("counts active and trialing rows whose period is still ahead", () => {
    expect(dbSubscriptionIsLive(dbSub({ status: "active", currentPeriodEnd: FUTURE }), NOW)).toBe(true);
    expect(dbSubscriptionIsLive(dbSub({ status: "trialing", currentPeriodEnd: FUTURE }), NOW)).toBe(true);
  });

  it("rejects lapsed periods and non-live statuses", () => {
    expect(dbSubscriptionIsLive(dbSub({ status: "active", currentPeriodEnd: PAST }), NOW)).toBe(false);
    expect(dbSubscriptionIsLive(dbSub({ status: "canceled", currentPeriodEnd: FUTURE }), NOW)).toBe(false);
    expect(dbSubscriptionIsLive(dbSub({ status: "past_due", currentPeriodEnd: FUTURE }), NOW)).toBe(false);
    expect(dbSubscriptionIsLive(null, NOW)).toBe(false);
    expect(dbSubscriptionIsLive(undefined, NOW)).toBe(false);
  });
});

describe("resolveCheckoutGuard", () => {
  it("blocks a member whose DB subscription is active", async () => {
    const p = ports();
    const d = await resolveCheckoutGuard({
      ...base,
      dbSub: dbSub({ status: "active", currentPeriodEnd: FUTURE }),
      ports: p,
    });
    expect(d).toEqual({ kind: "blocked", reason: "db_subscription" });
    expect(p.listCustomersByEmail).not.toHaveBeenCalled();
  });

  it("blocks a member whose DB subscription is trialing (the pre-F6 hole)", async () => {
    const d = await resolveCheckoutGuard({
      ...base,
      dbSub: dbSub({ status: "trialing", currentPeriodEnd: FUTURE }),
      ports: ports(),
    });
    expect(d).toEqual({ kind: "blocked", reason: "db_subscription" });
  });

  it("lets an ambient-only member buy a tier plan on the same customer (Ambient carve-out)", async () => {
    const p = ports();
    const d = await resolveCheckoutGuard({
      ...base,
      dbSub: dbSub({
        status: "active",
        currentPeriodEnd: FUTURE,
        stripePriceId: "price_ambient",
      }),
      ports: p,
      plan: "monthly",
      ambientPriceId: "price_ambient",
    });
    expect(d).toEqual({ kind: "proceed", customerId: "cus_db" });
    expect(p.listCustomersByEmail).not.toHaveBeenCalled();
  });

  it("still blocks an ambient-only member re-buying ambient (a duplicate)", async () => {
    const d = await resolveCheckoutGuard({
      ...base,
      dbSub: dbSub({
        status: "trialing",
        currentPeriodEnd: FUTURE,
        stripePriceId: "price_ambient",
      }),
      ports: ports(),
      plan: "ambient",
      ambientPriceId: "price_ambient",
    });
    expect(d).toEqual({ kind: "blocked", reason: "db_subscription" });
  });

  it("still blocks a tier holder buying ambient (they already have access)", async () => {
    const d = await resolveCheckoutGuard({
      ...base,
      dbSub: dbSub({
        status: "active",
        currentPeriodEnd: FUTURE,
        stripePriceId: "price_monthly",
      }),
      ports: ports(),
      plan: "ambient",
      ambientPriceId: "price_ambient",
    });
    expect(d).toEqual({ kind: "blocked", reason: "db_subscription" });
  });

  it("reuses the DB customer for a resubscribe, without touching Stripe reads", async () => {
    const p = ports();
    const d = await resolveCheckoutGuard({ ...base, dbSub: dbSub(), ports: p });
    expect(d).toEqual({ kind: "proceed", customerId: "cus_db" });
    expect(p.listCustomersByEmail).not.toHaveBeenCalled();
    expect(p.listCustomerSubscriptions).not.toHaveBeenCalled();
  });

  it("proceeds with no customer when there is no DB row and no email match", async () => {
    const d = await resolveCheckoutGuard({ ...base, dbSub: null, ports: ports() });
    expect(d).toEqual({ kind: "proceed", customerId: undefined });
  });

  it("proceeds without any lookup when the session carries no email", async () => {
    const p = ports();
    const d = await resolveCheckoutGuard({ ...base, email: null, dbSub: null, ports: p });
    expect(d).toEqual({ kind: "proceed", customerId: undefined });
    expect(p.listCustomersByEmail).not.toHaveBeenCalled();
  });

  it("reuses the email-matched customer instead of minting a duplicate", async () => {
    const p = ports({
      listCustomersByEmail: vi.fn(async () => [{ id: "cus_found", metadata: {} }]),
    });
    const d = await resolveCheckoutGuard({ ...base, dbSub: null, ports: p });
    expect(d).toEqual({ kind: "proceed", customerId: "cus_found" });
    expect(p.listCustomerSubscriptions).toHaveBeenCalledWith("cus_found");
  });

  it("prefers the customer whose metadata names this user", async () => {
    const p = ports({
      listCustomersByEmail: vi.fn(async () => [
        { id: "cus_other", metadata: { userId: "someone_else" } },
        { id: "cus_mine", metadata: { userId: "user_1" } },
      ]),
    });
    const d = await resolveCheckoutGuard({ ...base, dbSub: null, ports: p });
    expect(d).toEqual({ kind: "proceed", customerId: "cus_mine" });
  });

  it("blocks when ANY customer under the email holds a live subscription", async () => {
    const p = ports({
      listCustomersByEmail: vi.fn(
        async (): Promise<GuardStripeCustomer[]> => [
          { id: "cus_mine", metadata: { userId: "user_1" } },
          { id: "cus_guest", metadata: {} },
        ],
      ),
      listCustomerSubscriptions: vi.fn(async (id: string) =>
        id === "cus_guest" ? [{ status: "trialing" }] : [],
      ),
    });
    const d = await resolveCheckoutGuard({ ...base, dbSub: null, ports: p });
    expect(d).toEqual({ kind: "blocked", reason: "stripe_subscription" });
  });

  it("does not block on dead subscriptions under the email", async () => {
    const p = ports({
      listCustomersByEmail: vi.fn(async () => [{ id: "cus_found", metadata: {} }]),
      listCustomerSubscriptions: vi.fn(async () => [
        { status: "canceled" },
        { status: "incomplete_expired" },
      ]),
    });
    const d = await resolveCheckoutGuard({ ...base, dbSub: null, ports: p });
    expect(d).toEqual({ kind: "proceed", customerId: "cus_found" });
  });

  it("fails open when the email lookup itself throws", async () => {
    const p = ports({
      listCustomersByEmail: vi.fn(async () => {
        throw new Error("stripe down");
      }),
    });
    const d = await resolveCheckoutGuard({ ...base, dbSub: null, ports: p });
    expect(d).toEqual({ kind: "proceed", customerId: undefined });
  });

  it("fails open when a subscription list throws — the found customer is still reused", async () => {
    const p = ports({
      listCustomersByEmail: vi.fn(async () => [{ id: "cus_found", metadata: {} }]),
      listCustomerSubscriptions: vi.fn(async () => {
        throw new Error("stripe down");
      }),
    });
    const d = await resolveCheckoutGuard({ ...base, dbSub: null, ports: p });
    expect(d).toEqual({ kind: "proceed", customerId: "cus_found" });
  });
});
