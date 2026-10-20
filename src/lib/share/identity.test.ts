// Share-identity tests against in-memory fakes of the DB slice and of
// the affiliate attribution module. The properties under test are the
// product rules: one anon identity per device token; minted codes
// never collide with affiliate codes; signups against an unclaimed
// code wait as pending referrals; the FIRST account to claim owns
// the identity forever, gains the code as its referralCode when it
// has no profile, and inherits every pre-claim signup as a real
// attribution (+ invite bonus); a second account can never re-claim.
import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  identities: new Map<string, any>(), // id -> ShareIdentity row
  profiles: new Map<string, any>(), // userId -> AffiliateProfile row
  attributions: new Map<string, string>(), // referredUserId -> affiliateProfileId
  pending: new Map<string, any>(), // referredUserId -> ShareReferral row
  grants: [] as string[], // inviteeUserIds the bonus was granted for
  seq: 0,
}));

function profileByCode(code: string) {
  for (const p of state.profiles.values()) {
    if (p.referralCode === code || p.customCode === code) return p;
  }
  return null;
}

vi.mock("@/lib/db", () => ({
  db: {
    shareIdentity: {
      findUnique: async ({ where }: any) => {
        if (where.code) return [...state.identities.values()].find(i => i.code === where.code) ?? null;
        if (where.deviceTokenHash) return [...state.identities.values()].find(i => i.deviceTokenHash === where.deviceTokenHash) ?? null;
        if (where.claimedByUserId) return [...state.identities.values()].find(i => i.claimedByUserId === where.claimedByUserId) ?? null;
        if (where.id) return state.identities.get(where.id) ?? null;
        return null;
      },
      create: async ({ data }: any) => {
        for (const i of state.identities.values()) {
          if (i.code === data.code) throw new Error("Unique constraint failed on the fields: (`code`)");
          if (i.deviceTokenHash === data.deviceTokenHash) throw new Error("Unique constraint failed on the fields: (`deviceTokenHash`)");
        }
        const row = { id: `si_${++state.seq}`, claimedByUserId: null, claimedAt: null, createdAt: new Date(), ...data };
        state.identities.set(row.id, row);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const row = state.identities.get(where.id);
        if (!row) return { count: 0 };
        if (where.claimedByUserId === null && row.claimedByUserId !== null) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
      count: async ({ where }: any) =>
        [...state.identities.values()].filter(
          i => i.mintIpHash === where.mintIpHash && i.createdAt >= where.createdAt.gte,
        ).length,
    },
    affiliateProfile: {
      findUnique: async ({ where }: any) => state.profiles.get(where.userId) ?? null,
      findFirst: async ({ where }: any) => {
        const codes = (where.OR ?? []).flatMap((c: any) => [c.referralCode, c.customCode]).filter(Boolean);
        return profileByCode(codes[0]) ?? null;
      },
      create: async ({ data }: any) => {
        const row = { id: `ap_${++state.seq}`, customCode: null, status: "active", ...data };
        state.profiles.set(data.userId, row);
        return row;
      },
    },
    shareReferral: {
      findUnique: async ({ where }: any) => {
        if (where.referredUserId) return state.pending.get(where.referredUserId) ?? null;
        if (where.id) return [...state.pending.values()].find(r => r.id === where.id) ?? null;
        return null;
      },
      create: async ({ data }: any) => {
        if (state.pending.has(data.referredUserId)) {
          throw new Error("Unique constraint failed on the fields: (`referredUserId`)");
        }
        const row = { id: `sr_${++state.seq}`, flushedAt: null, createdAt: new Date(), ...data };
        state.pending.set(data.referredUserId, row);
        return row;
      },
      findMany: async ({ where }: any) =>
        [...state.pending.values()].filter(
          r =>
            r.shareIdentityId === where.shareIdentityId &&
            (where.flushedAt === null ? r.flushedAt === null : where.flushedAt?.not === null ? r.flushedAt !== null : true),
        ),
      update: async ({ where, data }: any) => {
        const row = [...state.pending.values()].find(r => r.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
    referralAttribution: {
      findUnique: async ({ where }: any) => {
        const pid = state.attributions.get(where.referredUserId);
        return pid ? { id: `ra_${where.referredUserId}`, affiliateProfileId: pid } : null;
      },
    },
  },
}));

vi.mock("@/lib/affiliate/attribution", () => ({
  REF_CODE_RE: /^[a-z0-9_-]{3,32}$/i,
  getRefCookie: async () => null,
  findAffiliateByCode: async (code: string) => {
    const p = profileByCode(code.toLowerCase());
    return p && p.status === "active" ? p : null;
  },
  linkAttribution: async (referredUserId: string, affiliateProfileId: string) => {
    if (state.attributions.has(referredUserId)) {
      return { id: "existing", affiliateProfileId: state.attributions.get(referredUserId) };
    }
    const profile = [...state.profiles.values()].find(p => p.id === affiliateProfileId);
    if (!profile || profile.status !== "active") return null;
    if (profile.userId === referredUserId) return null;
    state.attributions.set(referredUserId, affiliateProfileId);
    return { id: `ra_${referredUserId}`, affiliateProfileId };
  },
}));

vi.mock("@/lib/camera-bonus", () => ({
  grantInviteCameraBonus: async (inviteeUserId: string) => {
    state.grants.push(inviteeUserId);
    return true;
  },
}));

import {
  attributeUserToShareCode,
  claimShareIdentity,
  getShareCodeForUser,
  hashDeviceToken,
  isValidDeviceToken,
  mintShareIdentity,
  resolveShareCode,
} from "./identity";

const TOKEN = "device-token-abcdef-123456";
const TOKEN2 = "device-token-zzzzzz-654321";
const IP = "iphash-1";

function seedProfile(userId: string, referralCode: string, customCode: string | null = null) {
  const p = { id: `ap_${userId}`, userId, referralCode, customCode, status: "active" };
  state.profiles.set(userId, p);
  return p;
}

beforeEach(() => {
  state.identities.clear();
  state.profiles.clear();
  state.attributions.clear();
  state.pending.clear();
  state.grants.length = 0;
  state.seq = 0;
});

describe("device tokens", () => {
  it("validates shape and hashes deterministically", () => {
    expect(isValidDeviceToken(TOKEN)).toBe(true);
    expect(isValidDeviceToken("short")).toBe(false);
    expect(isValidDeviceToken("has spaces in it!!")).toBe(false);
    expect(isValidDeviceToken(42)).toBe(false);
    expect(hashDeviceToken(TOKEN)).toBe(hashDeviceToken(TOKEN));
    expect(hashDeviceToken(TOKEN)).not.toBe(TOKEN);
  });
});

describe("minting", () => {
  it("mints one identity per device token, idempotently", async () => {
    const a = await mintShareIdentity(TOKEN, IP);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.created).toBe(true);
    expect(a.identity.code).toMatch(/^we[a-z0-9]{10}$/);

    const b = await mintShareIdentity(TOKEN, IP);
    expect(b.ok && !b.created && b.identity.code === a.identity.code).toBe(true);
    expect(state.identities.size).toBe(1);
  });

  it("rejects malformed tokens and rate-limits per IP", async () => {
    expect(await mintShareIdentity("nope", IP)).toEqual({ ok: false, reason: "invalid-token" });
    for (let i = 0; i < 5; i++) {
      const r = await mintShareIdentity(`tok-${i}-abcdefghij`, IP);
      expect(r.ok).toBe(true);
    }
    const sixth = await mintShareIdentity("tok-6-abcdefghij", IP);
    expect(sixth).toEqual({ ok: false, reason: "rate-limited" });
    // A different IP is unaffected.
    const other = await mintShareIdentity("tok-7-abcdefghij", "iphash-2");
    expect(other.ok).toBe(true);
  });

  it("never mints a code an affiliate already owns", async () => {
    seedProfile("u-taken", "wetaken1234");
    for (let i = 0; i < 25; i++) {
      const r = await mintShareIdentity(`bulk-${i}-abcdefghij`, `ip-${i}`);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.identity.code).not.toBe("wetaken1234");
    }
    const codes = new Set([...state.identities.values()].map(i => i.code));
    expect(codes.size).toBe(25);
  });
});

describe("signup attribution against share codes", () => {
  it("records a pending referral for an unclaimed code — and no attribution yet", async () => {
    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    const res = await attributeUserToShareCode("friend-1", m.identity.code);
    expect(res).toEqual({ kind: "pending" });
    expect(state.pending.get("friend-1")?.shareIdentityId).toBe(m.identity.id);
    expect(state.attributions.has("friend-1")).toBe(false);
    // Idempotent: a second sync reports the same pending row.
    expect(await attributeUserToShareCode("friend-1", m.identity.code)).toEqual({ kind: "pending" });
  });

  it("flushes immediately when the code is already claimed as an alias", async () => {
    const ownerProfile = seedProfile("owner-1", "owner1code");
    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    await claimShareIdentity("owner-1", TOKEN);
    const res = await attributeUserToShareCode("friend-2", m.identity.code);
    expect(res).toEqual({ kind: "flushed" });
    expect(state.attributions.get("friend-2")).toBe(ownerProfile.id);
  });

  it("after a profile-creating claim the code resolves as a plain affiliate code (the affiliate path owns it)", async () => {
    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    await claimShareIdentity("owner-9", TOKEN);
    expect((await resolveShareCode(m.identity.code))?.kind).toBe("affiliate");
    expect(await attributeUserToShareCode("friend-9", m.identity.code)).toBeNull();
  });

  it("leaves affiliate codes to the affiliate path and refuses self-attribution", async () => {
    seedProfile("u-aff", "affcode1");
    expect(await attributeUserToShareCode("friend-3", "affcode1")).toBeNull();

    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    await claimShareIdentity("owner-2", TOKEN);
    expect(await attributeUserToShareCode("owner-2", m.identity.code)).toBeNull();
    expect(await attributeUserToShareCode("friend-4", "nonexistent")).toBeNull();
  });
});

describe("claim / merge", () => {
  it("is a no-op for unknown devices and cannot be taken by a second account", async () => {
    expect(await claimShareIdentity("u-x", TOKEN2)).toEqual({ status: "no-identity" });

    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    const first = await claimShareIdentity("owner-3", TOKEN);
    expect(first.status).toBe("claimed");
    expect(await claimShareIdentity("intruder", TOKEN)).toEqual({ status: "claimed-by-other" });
    const again = await claimShareIdentity("owner-3", TOKEN);
    expect(again.status).toBe("already-claimed");
  });

  it("makes the anon code the claimer's referralCode when they have no profile, and flushes pre-claim signups", async () => {
    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    await attributeUserToShareCode("early-friend", m.identity.code);

    const res = await claimShareIdentity("new-owner", TOKEN);
    expect(res.status).toBe("claimed");
    if (res.status !== "claimed") return;
    expect(res.profileCreated).toBe(true);
    expect(res.profileCode).toBe(m.identity.code);
    expect(res.flushed).toBe(1);
    // The pre-claim signup now counts for the claimer, bonus included.
    const profile = state.profiles.get("new-owner");
    expect(profile.referralCode).toBe(m.identity.code);
    expect(state.attributions.get("early-friend")).toBe(profile.id);
    expect(state.pending.get("early-friend")?.flushedAt).toBeInstanceOf(Date);
    expect(state.grants).toContain("early-friend");
  });

  it("keeps an existing profile's code as canonical and treats the anon code as an alias", async () => {
    const existing = seedProfile("established", "established1");
    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    await attributeUserToShareCode("alias-friend", m.identity.code);

    const res = await claimShareIdentity("established", TOKEN);
    expect(res.status).toBe("claimed");
    if (res.status !== "claimed") return;
    expect(res.profileCreated).toBe(false);
    expect(res.profileCode).toBe("established1");
    expect(state.attributions.get("alias-friend")).toBe(existing.id);

    // The alias keeps resolving to the owner's profile.
    const resolved = await resolveShareCode(m.identity.code);
    expect(resolved?.kind).toBe("claimed");
    if (resolved?.kind === "claimed") expect(resolved.profile.id).toBe(existing.id);
  });
});

describe("resolution + per-user code", () => {
  it("resolves affiliate, anon and unknown codes distinctly", async () => {
    seedProfile("u-aff", "affcode9");
    expect((await resolveShareCode("affcode9"))?.kind).toBe("affiliate");
    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    expect((await resolveShareCode(m.identity.code))?.kind).toBe("anon");
    expect(await resolveShareCode("nosuchcode")).toBeNull();
  });

  it("reports the user's share code: affiliate first, claimed alias second", async () => {
    expect(await getShareCodeForUser("nobody")).toBeNull();
    const m = await mintShareIdentity(TOKEN, IP);
    if (!m.ok) throw new Error("mint failed");
    await claimShareIdentity("claimer", TOKEN);
    // Claim created a profile with the anon code → affiliate kind.
    expect(await getShareCodeForUser("claimer")).toEqual({ code: m.identity.code, kind: "affiliate" });
    seedProfile("u-custom", "plaincode", "fancycode");
    expect(await getShareCodeForUser("u-custom")).toEqual({ code: "fancycode", kind: "affiliate" });
  });
});
