// GET /api/affiliate/studio/badges — the caller's Studio badge state.
// Evaluating badges lazily awards any newly-earned badges (+ XP).
//
// Gate: any signed-in affiliate (requireAffiliate), NOT requireStudioAccess.
// This state is displayed on the affiliate DASHBOARD (BadgesStrip), which is
// not member-gated — gating the read like a Studio tool made the strip
// silently vanish for every affiliate without an active paid membership
// (the strip hides itself on 403), even though the rest of the dashboard
// loaded fine. Using the Studio stays membership-gated; viewing badge
// progress does not.
import { NextResponse } from "next/server";
import { evaluateBadges } from "@/lib/studio/badges";
import { requireAffiliate } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const badges = await evaluateBadges(profile.id);
  return NextResponse.json({
    badges,
    showcaseEnabled: profile.showcaseEnabled,
    isAmbassador: profile.isAmbassador,
  });
}
