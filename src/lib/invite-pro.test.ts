// Invite-a-friend Pro-days reward tests against an in-memory fake of
// the DB slice the lib (and the comp engine it pays through) touches.
// The properties under test are the product rules: a reward requires a
// VERIFIED referred account with an attribution, pays the INVITER
// exactly +7 days of Pro through the comp engine, pays once per
// referred account no matter how often it re-fires, never pays for
// self-referral, caps at 5 rewarded invites per inviter per calendar
// month, and NEVER modifies a real Stripe subscription — a paid
// inviter's days bank in the ledger and land only once the paid row
// is gone.
import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  users: new Map<
    string,
    { emailVerified: Date | null; accounts: { provider: string }[] }
  >(),
  profiles: new Map<string, { id: string }>(), // userId -> profile
  attributions: new Map<string, string>(), // referredUserId -> inviterUserId
  grants: new Map<string, any>(), // inviteeUserId -> InviteProGrant row
  subs: new Map<string, any>(), // userId -> Subscription row
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: async ({ where }: any) => {
        const u = state.users.get(where.id);
        return u ? { emailVerified: u.emailVerified, accounts: u.accounts } : null;
      },
      findMany: async ({ where }: any) =>
        (where.id.in as string[])
          .map((id) => state.users.get(id))
          .filter(Boolean)
          .map((u) => ({ emailVerified: u!.emailVerified, accounts: u!.accounts })),
    },
    affiliateProfile: {
      findUnique: async ({ where }: any) => state.profiles.get(where.userId) ?? null,
    },
    referralAttribution: {
      findUnique: async ({ where }: any) => {
        const inviter = state.attributions.get(where.referredUserId);
        return inviter ? { affiliate: { userId: inviter } } : null;
      },
      findMany: async ({ where }: any) => {
        const rows: any[] = [];
        for (const [referredUserId, inviterUserId] of state.attributions) {
          const profile = state.profiles.get(inviterUserId);
          if (profile && profile.id === where.affiliateProfileId) {
            rows.push({ referredUserId });
          }
        }
        return rows;
      },
    },
    inviteProGrant: {
      findUnique: async ({ where }: any) =>
        state.grants.get(where.inviteeUserId) ?? null,
      create: async ({ data }: any) => {
        if (state.grants.has(data.inviteeUserId)) {
          throw new Error(
            "Unique constraint failed on the fields: (`inviteeUserId`)",
          );
        }
        const row = { id: `g_${data.inviteeUserId}`, createdAt: new Date(), ...data };
        state.grants.set(data.inviteeUserId, row);
        return row;
      },
      count: async ({ where }: any) =>
        [...state.grants.values()].filter(
          (g) =>
            g.inviterUserId === where.inviterUserId &&
            where.status.in.includes(g.status) &&
            g.createdAt >= where.createdAt.gte,
        ).length,
      findMany: async ({ where }: any) =>
        [...state.grants.values()].filter(
          (g) =>
            g.inviterUserId === where.inviterUserId &&
            (where.status === undefined || g.status === where.status),
        ),
      update: async ({ where, data }: any) => {
        const row = state.grants.get(where.inviteeUserId);
        if (row) Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of state.grants.values()) {
          if (where.id.in.includes(row.id) && row.status === where.status) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
      },
    },
    subscription: {
      findUnique: async ({ where }: any) => state.subs.get(where.userId) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const existing = state.subs.get(where.userId);
        const row = existing ? { ...existing, ...update } : { ...create };
        state.subs.set(where.userId, row);
        return row;
      },
    },
  },
}));

import {
  grantInviteProReward,
  applyBankedInviteProDays,
  getInviteProSummary,
  inviteProMonthStart,
  inviteProStatusFor,
  INVITE_PRO_DAYS,
  INVITE_PRO_MONTHLY_CAP,
} from "./invite-pro";

const DAY = 86_400_000;

function verifiedUser(id: string) {
  state.users.set(id, { emailVerified: new Date(), accounts: [] });
}
function googleUser(id: string) {
  state.users.set(id, {
    emailVerified: null,
    accounts: [{ provider: "google" }],
  });
}
function unverifiedUser(id: string) {
  state.users.set(id, { emailVerified: null, accounts: [] });
}
function refer(invitee: string, inviter: string) {
  state.attributions.set(invitee, inviter);
  state.profiles.set(inviter, { id: `p_${inviter}` });
}

beforeEach(() => {
  state.users.clear();
  state.profiles.clear();
  state.attributions.clear();
  state.grants.clear();
  state.subs.clear();
});

describe("grantInviteProReward", () => {
  it("pays the inviter +7 comp days when a referred friend verifies", async () => {
    verifiedUser("friend");
    refer("friend", "inviter");
    const before = Date.now();
    expect(await grantInviteProReward("friend")).toBe(true);
    const sub = state.subs.get("inviter");
    expect(sub.stripeSubscriptionId).toBe("comp_invite_inviter");
    expect(sub.status).toBe("active");
    expect(sub.currentPeriodEnd.getTime()).toBeGreaterThanOrEqual(before + 7 * DAY - 1000);
    expect(sub.currentPeriodEnd.getTime()).toBeLessThanOrEqual(Date.now() + 7 * DAY + 1000);
    const row = state.grants.get("friend");
    expect(row.status).toBe("granted");
    expect(row.days).toBe(INVITE_PRO_DAYS);
    expect(row.appliedAt).toBeTruthy();
  });

  it("counts a Google (provider-verified) account as verified", async () => {
    googleUser("friend");
    refer("friend", "inviter");
    expect(await grantInviteProReward("friend")).toBe(true);
    expect(state.grants.get("friend").status).toBe("granted");
  });

  it("pays nothing for an unverified friend", async () => {
    unverifiedUser("friend");
    refer("friend", "inviter");
    expect(await grantInviteProReward("friend")).toBe(false);
    expect(state.grants.size).toBe(0);
    expect(state.subs.size).toBe(0);
  });

  it("pays nothing without an attribution", async () => {
    verifiedUser("friend");
    expect(await grantInviteProReward("friend")).toBe(false);
    expect(state.grants.size).toBe(0);
  });

  it("never pays for self-referral", async () => {
    verifiedUser("solo");
    refer("solo", "solo");
    expect(await grantInviteProReward("solo")).toBe(false);
    expect(state.grants.size).toBe(0);
  });

  it("pays once per referred account, however often it re-fires", async () => {
    verifiedUser("friend");
    refer("friend", "inviter");
    expect(await grantInviteProReward("friend")).toBe(true);
    const endAfterFirst = state.subs.get("inviter").currentPeriodEnd.getTime();
    expect(await grantInviteProReward("friend")).toBe(false);
    expect(await grantInviteProReward("friend")).toBe(false);
    expect(state.grants.size).toBe(1);
    expect(state.subs.get("inviter").currentPeriodEnd.getTime()).toBe(endAfterFirst);
  });

  it("stacks additively on comp time the inviter already has", async () => {
    verifiedUser("friend");
    refer("friend", "inviter");
    const existingEnd = new Date(Date.now() + 10 * DAY);
    state.subs.set("inviter", {
      userId: "inviter",
      stripeCustomerId: "comp_creator_inviter",
      stripeSubscriptionId: "comp_creator_inviter",
      stripePriceId: "comp_free_pro",
      status: "active",
      currentPeriodStart: new Date(Date.now() - 20 * DAY),
      currentPeriodEnd: existingEnd,
      cancelAtPeriodEnd: false,
    });
    expect(await grantInviteProReward("friend")).toBe(true);
    const sub = state.subs.get("inviter");
    // The creator comp row keeps its own ids; only the period moved.
    expect(sub.stripeSubscriptionId).toBe("comp_creator_inviter");
    expect(sub.currentPeriodEnd.getTime()).toBe(existingEnd.getTime() + 7 * DAY);
  });

  it("banks the days when the inviter has a paid subscription — and never touches it", async () => {
    verifiedUser("friend");
    refer("friend", "inviter");
    const paidRow = {
      userId: "inviter",
      stripeCustomerId: "cus_real",
      stripeSubscriptionId: "sub_real123",
      stripePriceId: "price_pro_monthly",
      status: "active",
      currentPeriodStart: new Date(Date.now() - 5 * DAY),
      currentPeriodEnd: new Date(Date.now() + 25 * DAY),
      cancelAtPeriodEnd: false,
    };
    state.subs.set("inviter", paidRow);
    expect(await grantInviteProReward("friend")).toBe(true);
    expect(state.grants.get("friend").status).toBe("banked");
    expect(state.grants.get("friend").appliedAt).toBeNull();
    expect(state.subs.get("inviter")).toEqual(paidRow);
  });

  it("caps at 5 rewarded invites per inviter per calendar month", async () => {
    refer("newfriend", "inviter");
    verifiedUser("newfriend");
    for (let i = 0; i < INVITE_PRO_MONTHLY_CAP; i++) {
      state.grants.set(`old${i}`, {
        id: `g_old${i}`,
        inviteeUserId: `old${i}`,
        inviterUserId: "inviter",
        days: 7,
        status: "granted",
        createdAt: new Date(),
        appliedAt: new Date(),
      });
    }
    expect(await grantInviteProReward("newfriend")).toBe(true);
    const row = state.grants.get("newfriend");
    expect(row.status).toBe("capped");
    expect(state.subs.has("inviter")).toBe(false);
    // And the capped invitee can never pay out on a later re-fire.
    expect(await grantInviteProReward("newfriend")).toBe(false);
  });
});

describe("applyBankedInviteProDays", () => {
  it("applies banked days once the paid row is gone", async () => {
    verifiedUser("friend");
    refer("friend", "inviter");
    state.subs.set("inviter", {
      userId: "inviter",
      stripeSubscriptionId: "sub_real123",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 25 * DAY),
    });
    await grantInviteProReward("friend");
    expect(state.grants.get("friend").status).toBe("banked");

    // Paid sub still present: nothing applies.
    expect(await applyBankedInviteProDays("inviter")).toBe(0);
    expect(state.grants.get("friend").status).toBe("banked");

    // The webhook deletes the row when the paid sub ends.
    state.subs.delete("inviter");
    const before = Date.now();
    expect(await applyBankedInviteProDays("inviter")).toBe(1);
    expect(state.grants.get("friend").status).toBe("granted");
    const sub = state.subs.get("inviter");
    expect(sub.stripeSubscriptionId).toBe("comp_invite_inviter");
    expect(sub.currentPeriodEnd.getTime()).toBeGreaterThanOrEqual(before + 7 * DAY - 1000);
  });

  it("is a no-op with nothing banked", async () => {
    expect(await applyBankedInviteProDays("nobody")).toBe(0);
  });
});

describe("getInviteProSummary", () => {
  it("reports joined / verified / days from real rows", async () => {
    verifiedUser("f1");
    unverifiedUser("f2");
    refer("f1", "inviter");
    refer("f2", "inviter");
    await grantInviteProReward("f1");
    const s = await getInviteProSummary("inviter");
    expect(s.joined).toBe(2);
    expect(s.verified).toBe(1);
    expect(s.daysEarned).toBe(7);
    expect(s.daysBanked).toBe(0);
    expect(s.rewardedThisMonth).toBe(1);
    expect(s.monthlyCap).toBe(INVITE_PRO_MONTHLY_CAP);
    expect(s.daysPerInvite).toBe(INVITE_PRO_DAYS);
  });
});

describe("pure helpers", () => {
  it("inviteProMonthStart is the 1st of the month, UTC", () => {
    const start = inviteProMonthStart(new Date("2026-11-05T22:30:00Z"));
    expect(start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("inviteProStatusFor checks the cap before the comp decision", () => {
    expect(inviteProStatusFor(0, "grant")).toBe("granted");
    expect(inviteProStatusFor(0, "skip_paid")).toBe("banked");
    expect(inviteProStatusFor(INVITE_PRO_MONTHLY_CAP, "grant")).toBe("capped");
    expect(inviteProStatusFor(INVITE_PRO_MONTHLY_CAP, "skip_paid")).toBe("capped");
  });
});
