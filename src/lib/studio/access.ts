// Marketing Studio membership gate (Phase 2, Rule 1).
//
// Studio use requires BOTH an active affiliate profile AND an active
// WorldEye membership. Membership mirrors src/auth.ts
// `resolveSubscriptionStatus` and src/lib/recording/access.ts: the user's
// Subscription row exists, its status is "active" or "trialing", and its
// current period has not ended. Comp Pro grants (approved creators,
// Visionary affiliates) are Subscription rows too, so they qualify
// automatically under this check.
import { db } from "@/lib/db";
import { mintReferralCode } from "@/lib/affiliate/referral-code";
import { studioPublicTestAccess } from "./public-access";
import type { AffiliateProfile } from "@prisma/client";

export async function resolveMembership(userId: string): Promise<boolean> {
  try {
    const sub = await db.subscription.findUnique({ where: { userId } });
    return !!(
      sub &&
      (sub.status === "active" || sub.status === "trialing") &&
      sub.currentPeriodEnd > new Date()
    );
  } catch {
    return false;
  }
}

export type StudioAccessOutcome =
  | "ok"
  | "not_affiliate"
  | "inactive"
  | "membership_required";

/**
 * Pure gate decision. Precedence: not an affiliate first, then a
 * non-active affiliate status, then the membership requirement.
 */
export function evaluateStudioAccess(
  profile: { status: string } | null,
  member: boolean,
): StudioAccessOutcome {
  if (!profile) return "not_affiliate";
  if (profile.status !== "active") return "inactive";
  if (!member) return "membership_required";
  return "ok";
}

/**
 * TEMPORARY public test access (src/lib/studio/public-access.ts): when
 * the switch is on, the membership requirement is waived — every
 * outcome except "inactive" becomes "ok". A non-active profile keeps
 * its "inactive" verdict: the test toggle must not un-suspend an
 * account an admin suspended. "not_affiliate" only reaches "ok" in
 * combination with ensureStudioProfile below (the caller provisions
 * the profile first, so by decision time one exists and is active).
 */
export function withPublicTestAccess(
  outcome: StudioAccessOutcome,
  on: boolean,
): StudioAccessOutcome {
  if (!on) return outcome;
  return outcome === "inactive" ? "inactive" : "ok";
}

/** Same 3-namespace collision check as the join route
 *  (src/app/api/affiliate/join/route.ts): a candidate is taken if any
 *  profile (either code field), any former-code alias, or any share
 *  identity already owns it. */
async function studioCodeTaken(candidate: string): Promise<boolean> {
  const [profile, identity, alias] = await Promise.all([
    db.affiliateProfile.findFirst({
      where: { OR: [{ referralCode: candidate }, { customCode: candidate }] },
      select: { id: true },
    }),
    db.shareIdentity.findUnique({ where: { code: candidate }, select: { id: true } }),
    db.referralCodeAlias.findUnique({ where: { code: candidate }, select: { id: true } }).catch(() => null),
  ]);
  return !!profile || !!identity || !!alias;
}

/**
 * Return the user's affiliate profile, creating one exactly like the
 * free join flow when none exists: random referral code (same
 * collision check), status "active", referral attribution re-applied.
 * Used ONLY by the temporary public-test-access path.
 *
 * Deliberately does NOT award join XP, write an audit row, or fire a
 * growth event (the join route does all three) — a test toggle must
 * not become an XP-farming or analytics-skewing vector. Race-safe: a
 * create that loses a concurrent race falls back to re-reading.
 * Returns null when provisioning fails; callers then fall through to
 * the normal gate instead of erroring.
 */
export async function ensureStudioProfile(
  userId: string,
): Promise<AffiliateProfile | null> {
  const existing = await db.affiliateProfile
    .findUnique({ where: { userId } })
    .catch(() => null);
  if (existing) return existing;
  try {
    const code = await mintReferralCode(studioCodeTaken);
    const attr = await db.referralAttribution.findUnique({
      where: { referredUserId: userId },
    });
    return await db.affiliateProfile.create({
      data: {
        userId,
        referralCode: code,
        status: "active",
        recruitedByProfileId:
          attr && attr.affiliateProfileId ? attr.affiliateProfileId : null,
      },
    });
  } catch {
    // Lost a create race (or a transient failure): re-read once.
    return db.affiliateProfile
      .findUnique({ where: { userId } })
      .catch(() => null);
  }
}

/** Server-page helper: load the profile + membership and combine them. */
export async function getStudioGate(userId: string): Promise<{
  profile: AffiliateProfile | null;
  member: boolean;
  outcome: StudioAccessOutcome;
}> {
  // TEMPORARY public test access: provision a profile if needed and
  // waive membership via withPublicTestAccess. Provisioning failure
  // (null) falls through to the normal gate below; a non-active
  // profile keeps its "inactive" verdict (member then reports the
  // real membership state, as in the normal path).
  if (studioPublicTestAccess()) {
    const ensured = await ensureStudioProfile(userId);
    if (ensured) {
      const outcome = withPublicTestAccess(
        evaluateStudioAccess(ensured, true),
        true,
      );
      if (outcome === "ok") return { profile: ensured, member: true, outcome };
      const member = await resolveMembership(userId);
      return { profile: ensured, member, outcome };
    }
  }
  const [profile, member] = await Promise.all([
    db.affiliateProfile.findUnique({ where: { userId } }).catch(() => null),
    resolveMembership(userId),
  ]);
  return { profile, member, outcome: evaluateStudioAccess(profile, member) };
}
