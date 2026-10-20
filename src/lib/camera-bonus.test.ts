// Camera-bonus ledger tests against an in-memory fake of the DB slice
// the lib touches. The properties under test are the product rules:
// a grant requires an attribution, pays the INVITER exactly +15, pays
// once per invited account no matter how often it's re-run, never pays
// for self-referral, and consumption is floor-safe under racing spends.
import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  attributions: new Map<string, string>(), // referredUserId -> inviterUserId
  grants: new Map<string, { inviterUserId: string; amount: number }>(),
  accounts: new Map<string, number>(), // userId -> balance
}));

vi.mock("@/lib/db", () => ({
  db: {
    referralAttribution: {
      findUnique: async ({ where }: any) => {
        const inviter = state.attributions.get(where.referredUserId);
        return inviter ? { affiliate: { userId: inviter } } : null;
      },
    },
    cameraBonusGrant: {
      create: async ({ data }: any) => {
        if (state.grants.has(data.inviteeUserId)) {
          throw new Error(
            "Unique constraint failed on the fields: (`inviteeUserId`)",
          );
        }
        state.grants.set(data.inviteeUserId, {
          inviterUserId: data.inviterUserId,
          amount: data.amount,
        });
        return data;
      },
    },
    cameraBonusAccount: {
      findUnique: async ({ where }: any) => {
        const b = state.accounts.get(where.userId);
        return b === undefined ? null : { balance: b };
      },
      upsert: async ({ where, create, update }: any) => {
        const cur = state.accounts.get(where.userId);
        if (cur === undefined) state.accounts.set(where.userId, create.balance);
        else state.accounts.set(where.userId, cur + update.balance.increment);
        return { userId: where.userId, balance: state.accounts.get(where.userId) };
      },
      updateMany: async ({ where, data }: any) => {
        const cur = state.accounts.get(where.userId);
        if (cur === undefined || cur <= where.balance.gt) return { count: 0 };
        state.accounts.set(where.userId, cur - data.balance.decrement);
        return { count: 1 };
      },
    },
  },
}));

import {
  INVITE_CAMERA_BONUS,
  grantInviteCameraBonus,
  getCameraBonusBalance,
  consumeCameraBonus,
} from "./camera-bonus";

beforeEach(() => {
  state.attributions.clear();
  state.grants.clear();
  state.accounts.clear();
});

describe("grantInviteCameraBonus", () => {
  it("pays nothing without an attribution (invite sent ≠ friend joined)", async () => {
    expect(await grantInviteCameraBonus("friend-1")).toBe(false);
    expect(state.grants.size).toBe(0);
    expect(state.accounts.size).toBe(0);
  });

  it("pays the inviter +15 when the friend's signup is attributed to them", async () => {
    state.attributions.set("friend-1", "inviter-1");
    expect(await grantInviteCameraBonus("friend-1")).toBe(true);
    expect(INVITE_CAMERA_BONUS).toBe(15);
    expect(await getCameraBonusBalance("inviter-1")).toBe(15);
    // The friend earns nothing for being invited.
    expect(await getCameraBonusBalance("friend-1")).toBe(0);
  });

  it("is idempotent per invitee: re-runs (sync retries, webhook replays) pay once", async () => {
    state.attributions.set("friend-1", "inviter-1");
    expect(await grantInviteCameraBonus("friend-1")).toBe(true);
    expect(await grantInviteCameraBonus("friend-1")).toBe(false);
    expect(await grantInviteCameraBonus("friend-1")).toBe(false);
    expect(await getCameraBonusBalance("inviter-1")).toBe(15);
  });

  it("stacks across distinct invited friends", async () => {
    state.attributions.set("friend-1", "inviter-1");
    state.attributions.set("friend-2", "inviter-1");
    await grantInviteCameraBonus("friend-1");
    await grantInviteCameraBonus("friend-2");
    expect(await getCameraBonusBalance("inviter-1")).toBe(30);
  });

  it("never pays for a self-referral", async () => {
    state.attributions.set("user-1", "user-1");
    expect(await grantInviteCameraBonus("user-1")).toBe(false);
    expect(await getCameraBonusBalance("user-1")).toBe(0);
  });
});

describe("consumeCameraBonus", () => {
  it("spends down to zero and then refuses", async () => {
    state.accounts.set("user-1", 2);
    expect(await consumeCameraBonus("user-1")).toEqual({ consumed: true, balance: 1 });
    expect(await consumeCameraBonus("user-1")).toEqual({ consumed: true, balance: 0 });
    expect(await consumeCameraBonus("user-1")).toEqual({ consumed: false, balance: 0 });
  });

  it("a user with no bonus account simply has nothing to spend", async () => {
    expect(await consumeCameraBonus("ghost")).toEqual({ consumed: false, balance: 0 });
    expect(await getCameraBonusBalance("ghost")).toBe(0);
  });
});
