// Chain pins for POST /api/affiliate/sync-signup — the hop that turns
// a /ref landing into tracked value: we_ref cookie → ReferralAttribution
// row → the inviter's +15 camera-check bonus. Runs the REAL attribution
// and camera-bonus libs over an in-memory DB fake, so the properties
// pinned are the product's: a friend who JOINS through the link counts
// (invite-status counts these rows) and pays the inviter exactly once;
// clicks and self-referrals pay nothing. The share-code path is mocked
// out — it has its own pins in lib/share/identity.test.ts.
import { describe, it, expect, vi, beforeEach } from "vitest";

type Profile = { id: string; userId: string; referralCode: string; customCode: string | null; status: string };

const state = vi.hoisted(() => ({
  profiles: [] as Profile[],
  attributions: new Map<string, { affiliateProfileId: string; referredUserId: string; expiresAt: Date }>(),
  grants: new Map<string, { inviterUserId: string; amount: number }>(),
  accounts: new Map<string, number>(),
  cookies: new Map<string, string>(),
  session: null as { user?: { id?: string } } | null,
}));

vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      state.cookies.has(name) ? { value: state.cookies.get(name) } : undefined,
  }),
}));
vi.mock("@/lib/affiliate/settings", () => ({
  getSettings: async () => ({ attributionWindowDays: 30 }),
}));
vi.mock("@/lib/share/identity", () => ({
  attributeUserToShareCode: async () => null,
}));
vi.mock("@/lib/db", () => ({
  db: {
    affiliateProfile: {
      findFirst: async ({ where }: any) => {
        const codes = (where.OR ?? []).flatMap((c: any) => Object.values(c));
        return (
          state.profiles.find(
            (p) =>
              (codes.includes(p.referralCode) || codes.includes(p.customCode)) &&
              (!where.status || p.status === where.status),
          ) ?? null
        );
      },
      findUnique: async ({ where }: any) =>
        state.profiles.find(
          (p) => (where.id && p.id === where.id) || (where.userId && p.userId === where.userId),
        ) ?? null,
      updateMany: async () => ({ count: 0 }),
    },
    referralAttribution: {
      findUnique: async ({ where }: any) => {
        const row = state.attributions.get(where.referredUserId);
        if (!row) return null;
        const inviter = state.profiles.find((p) => p.id === row.affiliateProfileId);
        return { ...row, affiliate: inviter ? { userId: inviter.userId } : null };
      },
      create: async ({ data }: any) => {
        if (state.attributions.has(data.referredUserId)) {
          throw new Error("Unique constraint failed on the fields: (`referredUserId`)");
        }
        state.attributions.set(data.referredUserId, data);
        return data;
      },
    },
    cameraBonusGrant: {
      create: async ({ data }: any) => {
        if (state.grants.has(data.inviteeUserId)) {
          throw new Error("Unique constraint failed on the fields: (`inviteeUserId`)");
        }
        state.grants.set(data.inviteeUserId, { inviterUserId: data.inviterUserId, amount: data.amount });
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
    },
  },
}));

import { POST } from "./route";
import { getCameraBonusBalance } from "@/lib/camera-bonus";

const INVITER: Profile = {
  id: "p_inv",
  userId: "u_inviter",
  referralCode: "invitercode1",
  customCode: null,
  status: "active",
};

beforeEach(() => {
  state.profiles = [INVITER];
  state.attributions.clear();
  state.grants.clear();
  state.accounts.clear();
  state.cookies.clear();
  state.session = { user: { id: "u_new" } };
});

describe("POST /api/affiliate/sync-signup (invite chain)", () => {
  it("401 when signed out", async () => {
    state.session = null;
    expect((await POST()).status).toBe(401);
  });

  it("cookie → attribution → +15 to the inviter, counted once", async () => {
    state.cookies.set("we_ref", "invitercode1");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attributed).toBe(true);
    expect(body.affiliateProfileId).toBe("p_inv");
    // The attribution row invite-status counts exists…
    expect(state.attributions.get("u_new")?.affiliateProfileId).toBe("p_inv");
    // …and the inviter's bonus landed at JOIN time, per the UI copy.
    expect(await getCameraBonusBalance("u_inviter")).toBe(15);
  });

  it("re-firing the sync (later sign-ins, retries) never double-pays or double-counts", async () => {
    state.cookies.set("we_ref", "invitercode1");
    await POST();
    const res2 = await POST();
    expect((await res2.json()).attributed).toBe(true);
    expect(state.attributions.size).toBe(1);
    expect(state.grants.size).toBe(1);
    expect(await getCameraBonusBalance("u_inviter")).toBe(15);
  });

  it("self-referral (own link, own signup) attributes nothing and pays nothing", async () => {
    state.session = { user: { id: "u_inviter" } };
    state.cookies.set("we_ref", "invitercode1");
    const res = await POST();
    expect((await res.json()).attributed).toBe(false);
    expect(state.attributions.size).toBe(0);
    expect(await getCameraBonusBalance("u_inviter")).toBe(0);
  });

  it("an unknown code in the cookie attributes nothing", async () => {
    state.cookies.set("we_ref", "nosuchcode9");
    const res = await POST();
    expect((await res.json()).attributed).toBe(false);
    expect(state.attributions.size).toBe(0);
  });

  it("no cookie → nothing happens (a plain signup is not an invite)", async () => {
    const res = await POST();
    expect((await res.json()).attributed).toBe(false);
    expect(state.attributions.size).toBe(0);
    expect(await getCameraBonusBalance("u_inviter")).toBe(0);
  });
});
