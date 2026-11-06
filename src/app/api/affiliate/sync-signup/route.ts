// POST /api/affiliate/sync-signup — link a signed-in user to their referrer.
// Called client-side once after sign-in; the server reads the httpOnly
// referral cookie and creates the attribution row (idempotent).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { attributeUserToAffiliate } from "@/lib/affiliate/attribution";
import { attributeUserToShareCode } from "@/lib/share/identity";
import { grantInviteCameraBonus } from "@/lib/camera-bonus";
import {
  grantInviteProReward,
  applyBankedInviteProDays,
} from "@/lib/invite-pro";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const attr = await attributeUserToAffiliate(userId);
  // Universal share codes: if the cookie names an anonymous share
  // identity (or a claimed alias), record the signup against it —
  // pending until the code is claimed, flushed into a real
  // attribution at once when it already has an owner. Runs BEFORE
  // the bonus grant so a just-flushed attribution pays out in this
  // same sync. Best-effort, like the bonus: attribution hiccups must
  // never fail the sync itself.
  let share: string | null = null;
  try {
    share = (await attributeUserToShareCode(userId))?.kind ?? null;
  } catch (e) {
    console.error("[sync-signup] share attribution failed:", e);
  }
  // Invite-a-friend camera bonus: if this sign-in is the moment the
  // user's signup attribution landed, their inviter earns +15 camera
  // opens. Idempotent per invitee (unique grant ledger) — this route
  // re-fires on later sign-ins harmlessly. Best-effort: a bonus hiccup
  // must never fail the attribution sync itself.
  try {
    await grantInviteCameraBonus(userId);
  } catch (e) {
    console.error("[sync-signup] invite camera bonus failed:", e);
  }
  // Invite-a-friend Pro-days reward: a VERIFIED referred account earns
  // their inviter +7 days of Pro (comp engine only, lib/invite-pro).
  // This route is the OAuth path's hook — Google accounts are verified
  // by provider and never see the verify-email route — and it also
  // catches attributions flushed after verification. Idempotent per
  // invitee (unique grant ledger). Best-effort, like the bonus.
  try {
    await grantInviteProReward(userId);
  } catch (e) {
    console.error("[sync-signup] invite pro reward failed:", e);
  }
  // Banked invite days: if THIS user earned Pro days while a paid
  // subscription blocked the comp grant, apply them now — the paid
  // row may be gone (the webhook deletes it when the sub ends), and
  // every sign-in is a fresh chance. Best-effort.
  try {
    await applyBankedInviteProDays(userId);
  } catch (e) {
    console.error("[sync-signup] banked invite pro days failed:", e);
  }
  return NextResponse.json({ attributed: !!attr, affiliateProfileId: attr?.affiliateProfileId ?? null, share });
}
