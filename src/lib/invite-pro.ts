// ── Invite-a-friend Pro-days reward (server side) ────────────────
// A signed-in user earns INVITE_PRO_DAYS of Pro when a friend who
// joined through their /ref link VERIFIES their email — the moment
// the referred account counts as verified under the codebase's own
// rule (isVerifiedRow: the emailVerified stamp, or an OAuth provider
// that verifies the address itself). Never for sending an invite,
// never for a click, never for a mere signup: the camera-opens bonus
// (lib/camera-bonus) already pays at signup; this reward pays at
// verification, off the SAME ReferralAttribution rows.
//
// The Pro time is granted ONLY through the comp engine
// (lib/pro/comp): synthetic comp subscription rows, additive days.
// A real Stripe subscription is never created, modified, extended or
// downgraded — when the inviter has a paid row, the comp engine
// refuses and the earned days are BANKED in the ledger instead, then
// applied at the inviter's later sign-ins once the paid row is gone
// (the Stripe webhook deletes the row when a paid sub ends).
//
// Anti-farming shape:
//  - one reward per referred account, ever — InviteProGrant's
//    inviteeUserId is unique, so verification re-fires, repeat
//    sign-in syncs and replays all stop at the same key;
//  - at most INVITE_PRO_MONTHLY_CAP rewarded invites per inviter per
//    calendar month; a verification beyond the cap records a
//    "capped" row (no days) and that invitee can never pay out on a
//    later re-fire — the reward is decided at verification time;
//  - no self-referral (attribution itself refuses it; checked again
//    here, like the camera bonus).
//
// Callers: the points where verification becomes true —
// GET /api/auth/verify-email (password accounts, right after the
// stamp transaction) and POST /api/affiliate/sync-signup (every
// interactive sign-in: covers OAuth-verified accounts and
// attributions flushed after verification). Both treat the reward as
// best-effort; it is safe to call any number of times for the same
// invitee. The sync-signup route also calls
// applyBankedInviteProDays for the signed-in user as an inviter.
import { db } from "@/lib/db";
import { isVerifiedRow } from "@/lib/auth-verification";
import { compGrantDecision, grantCompProDays } from "@/lib/pro/comp";
import { INVITE_PRO_DAYS, INVITE_PRO_MONTHLY_CAP } from "./invite-pro-constants";

export { INVITE_PRO_DAYS, INVITE_PRO_MONTHLY_CAP };

export type InviteProStatus = "granted" | "banked" | "capped";

/** Pure: the start of the current calendar month (UTC). */
export function inviteProMonthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Pure: the ledger status for a fresh reward — the cap is checked
 * first (a capped verification pays nothing, whatever the inviter's
 * subscription looks like), then the comp engine's own decision:
 * grantable → granted; a paid row in the way → banked.
 */
export function inviteProStatusFor(
  rewardedThisMonth: number,
  decision: "grant" | "skip_paid",
): InviteProStatus {
  if (rewardedThisMonth >= INVITE_PRO_MONTHLY_CAP) return "capped";
  return decision === "grant" ? "granted" : "banked";
}

/**
 * Decide (and, where possible, pay) the inviter's Pro-days reward
 * for `inviteeUserId`'s verified account. Returns true when this call
 * recorded the reward in the ledger (granted, banked or capped).
 */
export async function grantInviteProReward(inviteeUserId: string): Promise<boolean> {
  // One reward per referred account, ever — cheap early-out before
  // the verification and attribution reads.
  const prior = await db.inviteProGrant.findUnique({
    where: { inviteeUserId },
    select: { id: true },
  });
  if (prior) return false;

  const invitee = await db.user.findUnique({
    where: { id: inviteeUserId },
    select: { emailVerified: true, accounts: { select: { provider: true } } },
  });
  if (!invitee || !isVerifiedRow(invitee)) return false;

  const attr = await db.referralAttribution.findUnique({
    where: { referredUserId: inviteeUserId },
    select: { affiliate: { select: { userId: true } } },
  });
  const inviterUserId = attr?.affiliate?.userId;
  if (!inviterUserId || inviterUserId === inviteeUserId) return false;

  const now = new Date();
  const [rewardedThisMonth, inviterSub] = await Promise.all([
    db.inviteProGrant.count({
      where: {
        inviterUserId,
        status: { in: ["granted", "banked"] },
        createdAt: { gte: inviteProMonthStart(now) },
      },
    }),
    db.subscription.findUnique({
      where: { userId: inviterUserId },
      select: { stripeSubscriptionId: true },
    }),
  ]);
  const status = inviteProStatusFor(
    rewardedThisMonth,
    compGrantDecision(inviterSub),
  );

  try {
    // Ledger first (the camera-bonus rule): the unique invitee key is
    // the claim — a concurrent re-fire loses here and applies nothing.
    await db.inviteProGrant.create({
      data: {
        inviteeUserId,
        inviterUserId,
        days: INVITE_PRO_DAYS,
        status,
        appliedAt: status === "granted" ? now : null,
      },
    });
  } catch (e) {
    if (e instanceof Error && /unique/i.test(e.message)) return false;
    throw e;
  }
  if (status !== "granted") return true;

  try {
    const res = await grantCompProDays(inviterUserId, "invite", INVITE_PRO_DAYS);
    if (!res.granted) {
      // The inviter's subscription changed between the read and the
      // grant (e.g. they just subscribed) — the days bank instead of
      // touching the paid row.
      await db.inviteProGrant.update({
        where: { inviteeUserId },
        data: { status: "banked", appliedAt: null },
      });
    }
  } catch {
    // Days earned but not applied — bank them; applyBankedInviteProDays
    // retries at the inviter's sign-ins.
    await db.inviteProGrant
      .update({
        where: { inviteeUserId },
        data: { status: "banked", appliedAt: null },
      })
      .catch(() => {});
  }
  return true;
}

/**
 * Apply an inviter's banked Pro days: the total is added through the
 * comp engine once no paid subscription row stands in the way. The
 * days were earned in their own months, so applying them does not
 * count against the current month's cap. Returns how many banked
 * grants were applied by this call.
 */
export async function applyBankedInviteProDays(
  inviterUserId: string,
): Promise<number> {
  const banked = await db.inviteProGrant.findMany({
    where: { inviterUserId, status: "banked" },
    select: { id: true, days: true },
    orderBy: { createdAt: "asc" },
  });
  if (banked.length === 0) return 0;

  const totalDays = banked.reduce((a, g) => a + g.days, 0);
  const res = await grantCompProDays(inviterUserId, "invite", totalDays);
  if (!res.granted) return 0;

  await db.inviteProGrant.updateMany({
    where: { id: { in: banked.map((g) => g.id) }, status: "banked" },
    data: { status: "granted", appliedAt: new Date() },
  });
  return banked.length;
}

export interface InviteProSummary {
  /** Friends who joined through the user's link (attribution rows). */
  joined: number;
  /** Of those, how many count as verified (isVerifiedRow). */
  verified: number;
  /** Pro days earned so far (applied + banked). */
  daysEarned: number;
  /** Earned days still banked behind a paid subscription. */
  daysBanked: number;
  /** Rewards recorded this calendar month (cap progress). */
  rewardedThisMonth: number;
  monthlyCap: number;
  daysPerInvite: number;
}

/** The Settings invite panel's numbers — real rows only. */
export async function getInviteProSummary(
  userId: string,
): Promise<InviteProSummary> {
  const profile = await db.affiliateProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  let joined = 0;
  let verified = 0;
  if (profile) {
    const attrs = await db.referralAttribution.findMany({
      where: { affiliateProfileId: profile.id },
      select: { referredUserId: true },
    });
    joined = attrs.length;
    if (joined > 0) {
      const users = await db.user.findMany({
        where: { id: { in: attrs.map((a) => a.referredUserId) } },
        select: {
          emailVerified: true,
          accounts: { select: { provider: true } },
        },
      });
      verified = users.filter((u) => isVerifiedRow(u)).length;
    }
  }

  const grants = await db.inviteProGrant.findMany({
    where: { inviterUserId: userId },
    select: { days: true, status: true, createdAt: true },
  });
  const earned = grants.filter(
    (g) => g.status === "granted" || g.status === "banked",
  );
  const monthStart = inviteProMonthStart(new Date());
  return {
    joined,
    verified,
    daysEarned: earned.reduce((a, g) => a + g.days, 0),
    daysBanked: grants
      .filter((g) => g.status === "banked")
      .reduce((a, g) => a + g.days, 0),
    rewardedThisMonth: earned.filter((g) => g.createdAt >= monthStart).length,
    monthlyCap: INVITE_PRO_MONTHLY_CAP,
    daysPerInvite: INVITE_PRO_DAYS,
  };
}
