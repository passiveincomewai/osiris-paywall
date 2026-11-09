// Donation recording — unit tests for the pure builders + the
// idempotent writer (db faked). The handler-level guarantee (a
// donation NEVER creates a subscription row) is pinned in
// src/app/api/webhooks/stripe/route.test.ts.
import { describe, it, expect, vi, beforeEach } from "vitest";

const H = vi.hoisted(() => {
  const store: {
    users: { id: string; supporter?: boolean }[];
    donations: Record<string, unknown>[];
  } = { users: [], donations: [] };
  const db = {
    user: {
      findUnique: async ({ where }: any) =>
        store.users.find((u) => u.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const u = store.users.find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return u ?? null;
      },
    },
    donation: {
      findUnique: async ({ where }: any) =>
        store.donations.find((d) => d.stripeRef === where.stripeRef) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `don_${store.donations.length + 1}`, ...data };
        store.donations.push(row);
        return row;
      },
    },
  };
  return { store, db };
});

vi.mock("@/lib/db", () => ({ db: H.db }));

import {
  donationFromCheckoutSession,
  donationFromInvoice,
  isDonationMetadata,
  recordDonation,
} from "./record";

beforeEach(() => {
  H.store.users = [{ id: "user-1", supporter: false }];
  H.store.donations = [];
});

describe("donation detection", () => {
  it("keys on metadata.type === 'donation' only", () => {
    expect(isDonationMetadata({ type: "donation" })).toBe(true);
    expect(isDonationMetadata({ type: "gift" })).toBe(false);
    expect(isDonationMetadata({ kind: "donation" })).toBe(false);
    expect(isDonationMetadata(null)).toBe(false);
    expect(isDonationMetadata(undefined)).toBe(false);
  });
  it("builds a session record and ignores non-donations", () => {
    const rec = donationFromCheckoutSession({
      id: "cs_1",
      amount_total: 1000,
      currency: "usd",
      metadata: { type: "donation", frequency: "monthly", source: "blog" },
      client_reference_id: "user-1",
      customer_details: { email: "donor@example.com" },
    } as any);
    expect(rec).toEqual({
      stripeRef: "cs_1",
      amountCents: 1000,
      currency: "usd",
      frequency: "monthly",
      source: "blog",
      userId: "user-1",
      email: "donor@example.com",
    });
    expect(
      donationFromCheckoutSession({
        id: "cs_2",
        metadata: { plan: "pro" },
      } as any),
    ).toBeNull();
  });
  it("builds an invoice record for renewals only", () => {
    const sub = { metadata: { type: "donation", source: "globe_toast", userId: "user-1" } } as any;
    expect(
      donationFromInvoice(
        { id: "in_9", amount_paid: 2500, currency: "usd", customer_email: "d@e.com" } as any,
        sub,
      ),
    ).toMatchObject({ stripeRef: "in_9", amountCents: 2500, frequency: "monthly" });
    expect(
      donationFromInvoice({ id: "in_0", amount_paid: 0 } as any, sub),
    ).toBeNull();
    expect(
      donationFromInvoice(
        { id: "in_1", amount_paid: 500 } as any,
        { metadata: { userId: "user-1" } } as any,
      ),
    ).toBeNull();
  });
});

describe("recordDonation", () => {
  it("records once, sets the supporter flag, and replays as a no-op", async () => {
    const input = {
      stripeRef: "cs_1",
      amountCents: 1000,
      currency: "usd",
      frequency: "once" as const,
      source: "blog",
      userId: "user-1",
      email: "donor@example.com",
    };
    await recordDonation(input);
    await recordDonation(input);
    expect(H.store.donations).toHaveLength(1);
    expect(H.store.users[0].supporter).toBe(true);
  });
  it("stores an unresolvable userId as null instead of failing", async () => {
    await recordDonation({
      stripeRef: "cs_2",
      amountCents: 500,
      currency: "usd",
      frequency: "once",
      source: null,
      userId: "ghost-user",
      email: null,
    });
    expect(H.store.donations).toHaveLength(1);
    expect(H.store.donations[0].userId).toBeNull();
  });
  it("guest donations record without a supporter update", async () => {
    await recordDonation({
      stripeRef: "cs_3",
      amountCents: 500,
      currency: "usd",
      frequency: "monthly",
      source: "footer_strip",
      userId: null,
      email: "guest@example.com",
    });
    expect(H.store.donations).toHaveLength(1);
    expect(H.store.users[0].supporter).toBe(false);
  });
});
