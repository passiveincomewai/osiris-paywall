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

/** Server-page helper: load the profile + membership and combine them. */
export async function getStudioGate(userId: string): Promise<{
  profile: AffiliateProfile | null;
  member: boolean;
  outcome: StudioAccessOutcome;
}> {
  const [profile, member] = await Promise.all([
    db.affiliateProfile.findUnique({ where: { userId } }).catch(() => null),
    resolveMembership(userId),
  ]);
  return { profile, member, outcome: evaluateStudioAccess(profile, member) };
}
