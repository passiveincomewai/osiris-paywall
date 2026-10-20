// Ownership-transfer pins:
//  - eligibility matrix: no sub / canceled (non-folding) sub / cycle
//    mismatch / already owns an org / ok (+ trialing folds active);
//  - confirm-string guard: only exactly "TRANSFER" passes, and a bad
//    confirm causes no DB or Stripe writes;
//  - seats = 0: DB swap only — NO Stripe calls at all;
//  - role swap + pending-downgrade cancel land in the DB transaction;
//  - rollback: if removing the seat item from the old owner fails
//    after it was added to the target, the new item is deleted and
//    nothing is written.
import { describe, it, expect, vi, beforeEach } from "vitest";

const MONTHLY_SEAT_PRICE = "price_1USklkGfHuTnzrlHCy6F9P2b"; // CREATED_SEAT_PRICE_IDS.monthly
const FUTURE = new Date("2027-01-01T00:00:00Z");
const PAST = new Date("2020-01-01T00:00:00Z");

const mocks = vi.hoisted(() => {
  const txOrgUpdate = vi.fn(async (arg: { data: Record<string, unknown> }) => ({
    id: "org1",
    pendingSeats: null,
    ...arg.data,
  }));
  const txMemberUpdate = vi.fn(async () => ({}));
  const txMemberFindUnique = vi.fn(async () => ({ id: "m-old", role: "owner" }) as unknown);
  const txMemberCreate = vi.fn(async () => ({}));
  return {
    orgFindUnique: vi.fn(async () => null as unknown),
    orgUpdate: vi.fn(async () => ({})),
    memberFindMany: vi.fn(async () => [] as unknown[]),
    memberFindUnique: vi.fn(async () => null as unknown),
    subFindUnique: vi.fn(async () => null as unknown),
    userFindUnique: vi.fn(async () => null as unknown),
    pricingFindUnique: vi.fn(async () => null as unknown),
    activityCreate: vi.fn(async () => ({})),
    pageViewCreate: vi.fn(async () => ({})),
    stripeUpdate: vi.fn(async () => ({}) as unknown),
    stripeDelItem: vi.fn(async () => ({})),
    txOrgUpdate,
    txMemberUpdate,
    txMemberFindUnique,
    txMemberCreate,
    transaction: vi.fn(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          organization: { update: txOrgUpdate },
          organizationMember: {
            update: txMemberUpdate,
            findUnique: txMemberFindUnique,
            create: txMemberCreate,
          },
        }),
    ),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    organization: { findUnique: mocks.orgFindUnique, update: mocks.orgUpdate },
    organizationMember: {
      findMany: mocks.memberFindMany,
      findUnique: mocks.memberFindUnique,
    },
    subscription: { findUnique: mocks.subFindUnique },
    user: { findUnique: mocks.userFindUnique },
    teamPricingConfig: { findUnique: mocks.pricingFindUnique },
    teamActivityLog: { create: mocks.activityCreate },
    pageView: { create: mocks.pageViewCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: () => ({
    subscriptions: { update: mocks.stripeUpdate, retrieve: vi.fn() },
    subscriptionItems: { del: mocks.stripeDelItem },
  }),
}));

import {
  assertTransferConfirmation,
  evaluateTransferEligibility,
  transferOrganization,
} from "./transfer";
import { TeamError } from "./permissions";

const subRow = (over: Record<string, unknown> = {}) => ({
  status: "active",
  currentPeriodEnd: FUTURE,
  stripePriceId: "price_monthly_base",
  stripeSubscriptionId: "sub_target",
  ...over,
});

function setupTransferOrg(over: Record<string, unknown> = {}) {
  const org = {
    id: "org1",
    ownerId: "user_owner",
    suspended: false,
    purchasedSeats: 0,
    stripeSeatItemId: null as string | null,
    stripeSeatPriceId: null as string | null,
    pendingSeats: null as number | null,
    pendingSeatsAt: null as Date | null,
    ...over,
  };
  mocks.orgFindUnique.mockImplementation(async (arg: { where: Record<string, string> }) => {
    if (arg.where.id === "org1") return org;
    if (arg.where.ownerId) return null; // target owns no org
    return null;
  });
  mocks.subFindUnique.mockImplementation(async (arg: { where: { userId: string } }) => {
    if (arg.where.userId === "user_target") return subRow();
    if (arg.where.userId === "user_owner") return subRow({ stripeSubscriptionId: "sub_owner" });
    return null;
  });
  mocks.memberFindUnique.mockResolvedValue({ id: "m-target", userId: "user_target", role: "admin" });
  mocks.userFindUnique.mockResolvedValue({ email: "target@example.com" });
  return org;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEEKLY_PRICE_ID = "price_weekly_base";
  process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly_base";
  process.env.STRIPE_ANNUAL_PRICE_ID = "price_annual_base";
  process.env.STRIPE_ENTERPRISE_PRICE_ID = "price_enterprise_base";
  mocks.pricingFindUnique.mockResolvedValue(null); // compiled-in defaults
  mocks.txMemberFindUnique.mockResolvedValue({ id: "m-old", role: "owner" });
  mocks.orgUpdate.mockResolvedValue({});
  mocks.stripeDelItem.mockResolvedValue({});
});

/* ---------------- eligibility matrix (pure) ---------------- */

describe("evaluateTransferEligibility", () => {
  const base = { orgCycle: "monthly" as const, targetOwnsOrganization: false };

  it("no subscription row → ineligible", () => {
    const r = evaluateTransferEligibility({ ...base, targetSub: null });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/no subscription/i);
  });

  it("canceled sub (does not fold active) → ineligible", () => {
    const r = evaluateTransferEligibility({
      ...base,
      targetSub: subRow({ status: "canceled" }),
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/isn't active/i);
  });

  it("trialing status with a lapsed period does not fold active → ineligible", () => {
    // subscriptionStatusFromRow folds active/trialing to "active" only
    // while the period is in the future; a lapsed trial returns the
    // raw "trialing" status and fails the === "active" gate.
    const r = evaluateTransferEligibility({
      ...base,
      targetSub: subRow({ status: "trialing", currentPeriodEnd: PAST }),
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/isn't active/i);
  });

  it("cycle mismatch → ineligible, naming both cycles", () => {
    const r = evaluateTransferEligibility({
      ...base,
      targetSub: subRow({ stripePriceId: "price_annual_base" }),
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/annual/);
    expect(r.reason).toMatch(/monthly/);
    expect(r.targetCycle).toBe("annual");
  });

  it("already owns an organization → ineligible", () => {
    const r = evaluateTransferEligibility({ ...base, targetSub: subRow(), targetOwnsOrganization: true });
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/already owns/i);
  });

  it("active sub on the org's cycle, owns nothing → eligible", () => {
    const r = evaluateTransferEligibility({ ...base, targetSub: subRow() });
    expect(r.eligible).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.targetCycle).toBe("monthly");
    expect(r.trialing).toBe(false);
  });

  it("trialing sub folds active → eligible and flagged trialing", () => {
    const r = evaluateTransferEligibility({ ...base, targetSub: subRow({ status: "trialing" }) });
    expect(r.eligible).toBe(true);
    expect(r.trialing).toBe(true);
  });

  it("enterprise price rides the annual cycle", () => {
    const r = evaluateTransferEligibility({
      orgCycle: "annual",
      targetOwnsOrganization: false,
      targetSub: subRow({ stripePriceId: "price_enterprise_base" }),
    });
    expect(r.eligible).toBe(true);
    expect(r.targetCycle).toBe("annual");
  });
});

/* ---------------- confirm guard ---------------- */

describe("confirm-string guard", () => {
  it("only exactly 'TRANSFER' passes", () => {
    expect(() => assertTransferConfirmation("TRANSFER")).not.toThrow();
    for (const bad of ["transfer", "Transfer", " TRANSFER", "TRANSFER ", "", undefined, null]) {
      expect(() => assertTransferConfirmation(bad)).toThrowError(TeamError);
      try {
        assertTransferConfirmation(bad);
      } catch (err) {
        expect((err as TeamError).status).toBe(400);
      }
    }
  });

  it("a bad confirm in transferOrganization writes nothing and calls no Stripe", async () => {
    setupTransferOrg();
    await expect(
      transferOrganization({
        orgId: "org1",
        callerId: "user_owner",
        newOwnerUserId: "user_target",
        confirm: "transfer",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.stripeUpdate).not.toHaveBeenCalled();
    expect(mocks.stripeDelItem).not.toHaveBeenCalled();
  });
});

/* ---------------- seats = 0: DB swap only ---------------- */

describe("transferOrganization — seats = 0", () => {
  it("makes NO stripe calls; swaps roles and cancels the pending downgrade in the transaction", async () => {
    setupTransferOrg({ purchasedSeats: 0, pendingSeats: 2, pendingSeatsAt: FUTURE });
    const res = await transferOrganization({
      orgId: "org1",
      callerId: "user_owner",
      newOwnerUserId: "user_target",
      confirm: "TRANSFER",
    });

    expect(res).toEqual({
      newOwnerEmail: "target@example.com",
      seatsMoved: 0,
      pendingDowngradeCancelled: true,
      targetTrialing: false,
    });
    expect(mocks.stripeUpdate).not.toHaveBeenCalled();
    expect(mocks.stripeDelItem).not.toHaveBeenCalled();

    // Org row: owner swapped, seat item cleared, pending downgrade cancelled.
    expect(mocks.txOrgUpdate).toHaveBeenCalledTimes(1);
    const orgArg = mocks.txOrgUpdate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(orgArg.data.ownerId).toBe("user_target");
    expect(orgArg.data.stripeSeatItemId).toBeNull();
    expect(orgArg.data.stripeSeatPriceId).toBeNull();
    expect(orgArg.data.pendingSeats).toBeNull();
    expect(orgArg.data.pendingSeatsAt).toBeNull();

    // Roles: target → owner, old owner → admin.
    const roleCalls = mocks.txMemberUpdate.mock.calls.map(
      (c) => c[0] as { where: { organizationId_userId: { userId: string } }; data: { role: string } },
    );
    expect(roleCalls).toContainEqual(
      expect.objectContaining({
        where: { organizationId_userId: { organizationId: "org1", userId: "user_target" } },
        data: { role: "owner" },
      }),
    );
    expect(roleCalls).toContainEqual(
      expect.objectContaining({
        where: { organizationId_userId: { organizationId: "org1", userId: "user_owner" } },
        data: { role: "admin" },
      }),
    );

    // Activity + analytics recorded.
    expect(mocks.activityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "organization_transferred",
          detail: expect.objectContaining({ fromUserId: "user_owner", toUserId: "user_target", seatsMoved: 0 }),
        }),
      }),
    );
    expect(mocks.pageViewCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ event: "team_ownership_transferred" }) }),
    );
  });

  it("non-owner caller is rejected", async () => {
    setupTransferOrg();
    await expect(
      transferOrganization({
        orgId: "org1",
        callerId: "user_target",
        newOwnerUserId: "user_owner",
        confirm: "TRANSFER",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("ineligible target (cycle mismatch) is rejected before any Stripe/DB write", async () => {
    setupTransferOrg({ purchasedSeats: 3, stripeSeatItemId: "si_old", stripeSeatPriceId: MONTHLY_SEAT_PRICE });
    mocks.subFindUnique.mockImplementation(async (arg: { where: { userId: string } }) => {
      if (arg.where.userId === "user_target") return subRow({ stripePriceId: "price_annual_base" });
      if (arg.where.userId === "user_owner") return subRow({ stripeSubscriptionId: "sub_owner" });
      return null;
    });
    await expect(
      transferOrganization({
        orgId: "org1",
        callerId: "user_owner",
        newOwnerUserId: "user_target",
        confirm: "TRANSFER",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.stripeUpdate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

/* ---------------- seats > 0: choreography + rollback ---------------- */

describe("transferOrganization — seats > 0", () => {
  const stripeSubWithSeat = {
    id: "sub_target",
    items: {
      data: [
        { id: "si_base_target", quantity: 1, price: { id: "price_monthly_base" } },
        { id: "si_new", quantity: 3, price: { id: MONTHLY_SEAT_PRICE, product: "prod_VTi94CLS52M2zn" } },
      ],
    },
  };

  it("adds the seat item to the target, removes it from the old owner, then swaps in the DB", async () => {
    setupTransferOrg({ purchasedSeats: 3, stripeSeatItemId: "si_old", stripeSeatPriceId: MONTHLY_SEAT_PRICE });
    mocks.stripeUpdate.mockResolvedValue(stripeSubWithSeat);

    const res = await transferOrganization({
      orgId: "org1",
      callerId: "user_owner",
      newOwnerUserId: "user_target",
      confirm: "TRANSFER",
    });
    expect(res.seatsMoved).toBe(3);
    expect(res.pendingDowngradeCancelled).toBe(false);

    // (a) seat item added to the TARGET's subscription, prorated.
    expect(mocks.stripeUpdate).toHaveBeenCalledWith("sub_target", {
      items: [{ price: MONTHLY_SEAT_PRICE, quantity: 3 }],
      proration_behavior: "create_prorations",
    });
    // (b) old owner's seat item deleted, prorated.
    expect(mocks.stripeDelItem).toHaveBeenCalledWith("si_old", { proration_behavior: "create_prorations" });

    // (c) transaction carries the NEW item id/price.
    const orgArg = mocks.txOrgUpdate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(orgArg.data.ownerId).toBe("user_target");
    expect(orgArg.data.stripeSeatItemId).toBe("si_new");
    expect(orgArg.data.stripeSeatPriceId).toBe(MONTHLY_SEAT_PRICE);

    // (d) reconcile from the target's Stripe subscription (global org update).
    expect(mocks.orgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org1" },
        data: expect.objectContaining({ purchasedSeats: 3, stripeSeatItemId: "si_new" }),
      }),
    );
  });

  it("rollback: step (b) failure deletes the just-created item and writes nothing", async () => {
    setupTransferOrg({ purchasedSeats: 3, stripeSeatItemId: "si_old", stripeSeatPriceId: MONTHLY_SEAT_PRICE });
    mocks.stripeUpdate.mockResolvedValue(stripeSubWithSeat);
    mocks.stripeDelItem
      .mockRejectedValueOnce(new Error("stripe down")) // (b) fails
      .mockResolvedValue({}); // rollback delete succeeds

    await expect(
      transferOrganization({
        orgId: "org1",
        callerId: "user_owner",
        newOwnerUserId: "user_target",
        confirm: "TRANSFER",
      }),
    ).rejects.toMatchObject({ status: 502 });

    // Rollback deleted the NEW item (found on the returned subscription).
    expect(mocks.stripeDelItem).toHaveBeenCalledTimes(2);
    expect(mocks.stripeDelItem.mock.calls[1]).toEqual(["si_new"]);
    // No database change at all.
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.txOrgUpdate).not.toHaveBeenCalled();
    expect(mocks.orgUpdate).not.toHaveBeenCalled();
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("step (a) failure: old owner's item untouched, nothing written", async () => {
    setupTransferOrg({ purchasedSeats: 3, stripeSeatItemId: "si_old", stripeSeatPriceId: MONTHLY_SEAT_PRICE });
    mocks.stripeUpdate.mockRejectedValue(new Error("stripe down"));
    await expect(
      transferOrganization({
        orgId: "org1",
        callerId: "user_owner",
        newOwnerUserId: "user_target",
        confirm: "TRANSFER",
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(mocks.stripeDelItem).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
