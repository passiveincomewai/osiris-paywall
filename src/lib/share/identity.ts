// ── Universal share identity (server) ────────────────────────────────
// The affiliate link system, opened to everyone:
//
//  - A signed-in user's share code is their affiliate code — resolved
//    through AffiliateProfile, never duplicated here.
//  - A signed-out visitor gets an anonymous ShareIdentity: one row per
//    device token (the token lives in the browser's localStorage and
//    is only ever stored here as a sha256 hash).
//  - /ref/<anon code> records ShareClicks and drops the same we_ref
//    cookie affiliate links drop. A signup carrying that cookie is
//    recorded as a pending ShareReferral — it cannot become a real
//    ReferralAttribution until the code has an owner.
//  - CLAIM: the first account to present the device token while
//    signed in takes the identity (one-time, server-enforced by the
//    unique claimedByUserId + a guarded update; a second account on
//    the same device is refused). If the claimer has no affiliate
//    profile, one is created with the anon code as its referralCode —
//    the code literally becomes their share code. If they already
//    have a profile, the anon code stays as an alias resolving to
//    them. Either way, pending ShareReferrals flush into real
//    attributions (+ the invite camera bonus) at claim time, so
//    sharing done before signup counts exactly like affiliate
//    sharing — and no new reward is invented anywhere in this file.

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  REF_CODE_RE,
  findAffiliateByCode,
  linkAttribution,
  getRefCookie,
} from "@/lib/affiliate/attribution";
import { grantInviteCameraBonus } from "@/lib/camera-bonus";

/* ── Device tokens ──────────────────────────────────────────────────── */

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(`we-share|${token}`).digest("hex");
}

export function isValidDeviceToken(token: unknown): token is string {
  return typeof token === "string" && token.length >= 16 && token.length <= 128 && /^[\w-]+$/.test(token);
}

/* ── Minting ────────────────────────────────────────────────────────── */

export const MINT_LIMIT_PER_HOUR = 5;
export const MINT_LIMIT_PER_DAY = 20;

function generateCodeCandidate(): string {
  // 'we' + 10 base36 chars — same shape family as affiliate codes,
  // comfortably inside REF_CODE_RE.
  return `we${randomBytes(8).toString("hex").slice(0, 6)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, "0")}${randomBytes(2).toString("hex").slice(0, 2)}`;
}

async function codeTaken(code: string): Promise<boolean> {
  const [byIdentity, byProfile] = await Promise.all([
    db.shareIdentity.findUnique({ where: { code }, select: { id: true } }),
    db.affiliateProfile.findFirst({
      where: { OR: [{ referralCode: code }, { customCode: code }] },
      select: { id: true },
    }),
  ]);
  return !!byIdentity || !!byProfile;
}

export type MintResult =
  | { ok: true; identity: { id: string; code: string; claimedByUserId: string | null }; created: boolean }
  | { ok: false; reason: "invalid-token" | "rate-limited" };

/**
 * Get-or-mint the anonymous identity for a device token. Idempotent
 * per token (one identity per device, ever); new mints are rate
 * limited per hashed IP so token rotation can't farm codes.
 */
export async function mintShareIdentity(deviceToken: string, mintIpHash: string): Promise<MintResult> {
  if (!isValidDeviceToken(deviceToken)) return { ok: false, reason: "invalid-token" };
  const deviceTokenHash = hashDeviceToken(deviceToken);

  const existing = await db.shareIdentity.findUnique({ where: { deviceTokenHash } });
  if (existing) {
    return { ok: true, identity: existing, created: false };
  }

  const hourAgo = new Date(Date.now() - 3600_000);
  const dayAgo = new Date(Date.now() - 86400_000);
  const [lastHour, lastDay] = await Promise.all([
    db.shareIdentity.count({ where: { mintIpHash, createdAt: { gte: hourAgo } } }),
    db.shareIdentity.count({ where: { mintIpHash, createdAt: { gte: dayAgo } } }),
  ]);
  if (lastHour >= MINT_LIMIT_PER_HOUR || lastDay >= MINT_LIMIT_PER_DAY) {
    return { ok: false, reason: "rate-limited" };
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCodeCandidate();
    if (!REF_CODE_RE.test(code)) continue;
    if (await codeTaken(code)) continue;
    try {
      const identity = await db.shareIdentity.create({
        data: { code, deviceTokenHash, mintIpHash },
      });
      return { ok: true, identity, created: true };
    } catch (e) {
      // A racing mint for the same token won — read its row back.
      if (e instanceof Error && /unique/i.test(e.message)) {
        const raced = await db.shareIdentity.findUnique({ where: { deviceTokenHash } });
        if (raced) return { ok: true, identity: raced, created: false };
      }
      throw e;
    }
  }
  // Practically unreachable (2^80 code space); fail as rate-limited
  // rather than minting something malformed.
  return { ok: false, reason: "rate-limited" };
}

export async function findShareIdentityByCode(code: string) {
  if (!REF_CODE_RE.test(code)) return null;
  return db.shareIdentity.findUnique({ where: { code: code.toLowerCase() } });
}

/* ── Code resolution ────────────────────────────────────────────────── */

export type ResolvedShareCode =
  | { kind: "affiliate"; profile: { id: string; userId: string; referralCode: string; customCode: string | null } }
  | { kind: "claimed"; identity: { id: string; code: string }; profile: { id: string; userId: string; referralCode: string; customCode: string | null } }
  | { kind: "anon"; identity: { id: string; code: string } };

/**
 * Resolve any share code the way a landing should: an affiliate code
 * first, then a share identity — claimed identities resolve to their
 * owner's active affiliate profile (the alias path), unclaimed ones
 * stay anonymous.
 */
export async function resolveShareCode(code: string): Promise<ResolvedShareCode | null> {
  const profile = await findAffiliateByCode(code);
  if (profile) return { kind: "affiliate", profile };

  const identity = await findShareIdentityByCode(code);
  if (!identity) return null;
  if (!identity.claimedByUserId) return { kind: "anon", identity };

  const ownerProfile = await db.affiliateProfile.findUnique({
    where: { userId: identity.claimedByUserId },
    select: { id: true, userId: true, referralCode: true, customCode: true, status: true },
  });
  if (ownerProfile && ownerProfile.status === "active") {
    return { kind: "claimed", identity, profile: ownerProfile };
  }
  // Claimed but the owner has no (active) profile: the code still
  // belongs to someone — treat as anonymous for attribution purposes.
  return { kind: "anon", identity };
}

/* ── Signup attribution for share codes ─────────────────────────────── */

/**
 * The share-code counterpart of attributeUserToAffiliate, called from
 * sync-signup right after it. Handles codes that are NOT (yet)
 * affiliate codes:
 *  - unclaimed identity → a pending ShareReferral is recorded;
 *  - claimed identity → the pending row is written AND flushed at
 *    once into a real ReferralAttribution against the owner's
 *    profile (the +15 invite bonus then flows through the caller's
 *    usual grant call, which is idempotent).
 * Returns what happened, or null when the code is an affiliate code
 * (owned by the existing path) or nothing resolves.
 */
export async function attributeUserToShareCode(
  referredUserId: string,
  refCode?: string | null,
): Promise<{ kind: "pending" | "flushed" | "already" } | null> {
  const existingAttr = await db.referralAttribution.findUnique({
    where: { referredUserId },
    select: { id: true },
  });
  if (existingAttr) return { kind: "already" };
  const existingPending = await db.shareReferral.findUnique({
    where: { referredUserId },
    select: { id: true, flushedAt: true },
  });
  if (existingPending) return { kind: existingPending.flushedAt ? "flushed" : "pending" };

  const code = (refCode ?? (await getRefCookie()))?.toLowerCase();
  if (!code) return null;

  const resolved = await resolveShareCode(code);
  if (!resolved || resolved.kind === "affiliate") return null;

  const identity = resolved.identity;
  const full = await db.shareIdentity.findUnique({
    where: { id: identity.id },
    select: { claimedByUserId: true },
  });
  if (full?.claimedByUserId === referredUserId) return null; // own link

  let row;
  try {
    row = await db.shareReferral.create({
      data: { shareIdentityId: identity.id, referredUserId },
    });
  } catch (e) {
    if (e instanceof Error && /unique/i.test(e.message)) return { kind: "already" };
    throw e;
  }

  if (resolved.kind === "claimed") {
    const flushed = await flushShareReferral(row.id, resolved.profile.id);
    return { kind: flushed ? "flushed" : "pending" };
  }
  return { kind: "pending" };
}

/** Convert one pending ShareReferral into a real attribution. */
async function flushShareReferral(shareReferralId: string, affiliateProfileId: string): Promise<boolean> {
  const row = await db.shareReferral.findUnique({ where: { id: shareReferralId } });
  if (!row || row.flushedAt) return false;
  const attr = await linkAttribution(row.referredUserId, affiliateProfileId);
  if (!attr) return false;
  await db.shareReferral.update({ where: { id: row.id }, data: { flushedAt: new Date() } });
  return true;
}

/** Flush every pending referral of an identity against a profile. */
export async function flushPendingShareReferrals(
  shareIdentityId: string,
  affiliateProfileId: string,
): Promise<number> {
  const pending = await db.shareReferral.findMany({
    where: { shareIdentityId, flushedAt: null },
    select: { id: true },
  });
  let flushed = 0;
  for (const row of pending) {
    if (await flushShareReferral(row.id, affiliateProfileId)) flushed++;
  }
  return flushed;
}

/* ── Claim / merge ──────────────────────────────────────────────────── */

export type ClaimResult =
  | { status: "no-identity" }
  | { status: "claimed-by-other" }
  | {
      status: "claimed" | "already-claimed";
      code: string;
      profileCode: string | null;
      profileCreated: boolean;
      flushed: number;
    };

/**
 * Attach a device's anonymous identity to a signed-in account.
 * First-claim-wins: the guarded update only lands while the identity
 * is unclaimed, and claimedByUserId is unique, so a second account on
 * the same device can never take it over.
 */
export async function claimShareIdentity(userId: string, deviceToken: string): Promise<ClaimResult> {
  if (!isValidDeviceToken(deviceToken)) return { status: "no-identity" };
  const deviceTokenHash = hashDeviceToken(deviceToken);
  const identity = await db.shareIdentity.findUnique({ where: { deviceTokenHash } });
  if (!identity) return { status: "no-identity" };
  if (identity.claimedByUserId && identity.claimedByUserId !== userId) {
    return { status: "claimed-by-other" };
  }

  let alreadyClaimed = identity.claimedByUserId === userId;
  if (!alreadyClaimed) {
    const res = await db.shareIdentity.updateMany({
      where: { id: identity.id, claimedByUserId: null },
      data: { claimedByUserId: userId, claimedAt: new Date() },
    });
    if (res.count !== 1) {
      // Lost a race — re-read to see who owns it now.
      const now = await db.shareIdentity.findUnique({ where: { id: identity.id } });
      if (now?.claimedByUserId !== userId) return { status: "claimed-by-other" };
      alreadyClaimed = true;
    }
  }

  // Ensure the claimer has an affiliate profile. With none, the anon
  // code becomes their referralCode; with one, their code stands and
  // the anon code remains an alias (resolution maps it to them).
  let profile = await db.affiliateProfile.findUnique({ where: { userId } });
  let profileCreated = false;
  if (!profile) {
    const collision = await db.affiliateProfile.findFirst({
      where: { OR: [{ referralCode: identity.code }, { customCode: identity.code }] },
      select: { id: true },
    });
    if (!collision) {
      const attr = await db.referralAttribution.findUnique({
        where: { referredUserId: userId },
        select: { affiliateProfileId: true },
      });
      profile = await db.affiliateProfile.create({
        data: {
          userId,
          referralCode: identity.code,
          status: "active",
          recruitedByProfileId: attr?.affiliateProfileId ?? null,
        },
      });
      profileCreated = true;
    }
  }

  let flushed = 0;
  if (profile) {
    flushed = await flushPendingShareReferrals(identity.id, profile.id);
    // The invite bonus for anything flushed here (or flushed earlier
    // through a path that couldn't grant) — idempotent per invitee.
    const mine = await db.shareReferral.findMany({
      where: { shareIdentityId: identity.id, flushedAt: { not: null } },
      select: { referredUserId: true },
    });
    for (const row of mine) {
      if (row.referredUserId === userId) continue;
      try {
        await grantInviteCameraBonus(row.referredUserId);
      } catch {
        /* best-effort: attribution stands; the bonus self-heals on
           the invitee's next sync-signup */
      }
    }
  }

  return {
    status: alreadyClaimed ? "already-claimed" : "claimed",
    code: identity.code,
    profileCode: profile ? (profile.customCode ?? profile.referralCode) : null,
    profileCreated,
    flushed,
  };
}

/** The share code a signed-in user should see and share with. */
export async function getShareCodeForUser(
  userId: string,
): Promise<{ code: string; kind: "affiliate" | "claimed" } | null> {
  const profile = await db.affiliateProfile.findUnique({
    where: { userId },
    select: { referralCode: true, customCode: true },
  });
  if (profile) return { code: profile.customCode ?? profile.referralCode, kind: "affiliate" };

  const identity = await db.shareIdentity.findUnique({
    where: { claimedByUserId: userId },
    select: { code: true },
  });
  if (identity) return { code: identity.code, kind: "claimed" };
  return null;
}
