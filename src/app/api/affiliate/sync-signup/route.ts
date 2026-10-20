// POST /api/affiliate/sync-signup — link a signed-in user to their referrer.
// Called client-side once after sign-in; the server reads the httpOnly
// referral cookie and creates the attribution row (idempotent).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { attributeUserToAffiliate } from "@/lib/affiliate/attribution";
import { attributeUserToShareCode } from "@/lib/share/identity";
import { grantInviteCameraBonus } from "@/lib/camera-bonus";

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
  return NextResponse.json({ attributed: !!attr, affiliateProfileId: attr?.affiliateProfileId ?? null, share });
}
