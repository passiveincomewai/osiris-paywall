// ── Invite-a-friend camera bonus (server side) ───────────────────────
// A signed-in user earns INVITE_CAMERA_BONUS extra camera opens when a
// friend COMPLETES SIGNUP through their /ref link — the moment a
// ReferralAttribution row for the friend names the user's affiliate
// profile. Never for sending an invite, never for a click: the grant
// keys off the attribution row and nothing else.
//
// Anti-farming shape:
//  - one grant per invited account, ever — CameraBonusGrant.inviteeUserId
//    is unique, so signup retries, repeat sign-in syncs and webhook
//    replays all stop at the same key;
//  - no self-referral (attribution itself refuses it; checked again here);
//  - the balance lives server-side (CameraBonusAccount), so spending it
//    works across devices and can't be minted from localStorage.
//
// Callers: the points where attribution is (idempotently) established —
// POST /api/affiliate/sync-signup (every interactive sign-in) and the
// Stripe webhook's invoice handler (guest-checkout claims). Both call
// grantInviteCameraBonus AFTER their attribution step; it is safe to
// call any number of times for the same invitee.
import { db } from "@/lib/db";
import { INVITE_CAMERA_BONUS } from "./camera-bonus-constants";

export { INVITE_CAMERA_BONUS };

/**
 * Award the inviter of `inviteeUserId` their +15, if this invitee's
 * signup hasn't already produced a grant. Returns true when a grant
 * was created by this call.
 */
export async function grantInviteCameraBonus(inviteeUserId: string): Promise<boolean> {
  const attr = await db.referralAttribution.findUnique({
    where: { referredUserId: inviteeUserId },
    select: { affiliate: { select: { userId: true } } },
  });
  const inviterUserId = attr?.affiliate?.userId;
  if (!inviterUserId || inviterUserId === inviteeUserId) return false;

  try {
    // Ledger first: if this throws unique, the bonus was already paid
    // for this invitee and the balance must not move.
    await db.cameraBonusGrant.create({
      data: { inviteeUserId, inviterUserId, amount: INVITE_CAMERA_BONUS },
    });
  } catch (e) {
    if (e instanceof Error && /unique/i.test(e.message)) return false;
    throw e;
  }
  await db.cameraBonusAccount.upsert({
    where: { userId: inviterUserId },
    create: { userId: inviterUserId, balance: INVITE_CAMERA_BONUS },
    update: { balance: { increment: INVITE_CAMERA_BONUS } },
  });
  return true;
}

/** The user's unspent bonus camera opens (0 when they have no account). */
export async function getCameraBonusBalance(userId: string): Promise<number> {
  const acct = await db.cameraBonusAccount.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return acct?.balance ?? 0;
}

/**
 * Spend one bonus open. The guarded updateMany is a single atomic
 * UPDATE … WHERE balance > 0, so two devices racing the same last
 * bonus can't both spend it. Returns the post-spend balance either way.
 */
export async function consumeCameraBonus(
  userId: string,
): Promise<{ consumed: boolean; balance: number }> {
  const res = await db.cameraBonusAccount.updateMany({
    where: { userId, balance: { gt: 0 } },
    data: { balance: { decrement: 1 } },
  });
  return { consumed: res.count === 1, balance: await getCameraBonusBalance(userId) };
}
