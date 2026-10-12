// GET /api/affiliate/studio/badges — the caller's Studio badge state.
// Evaluating badges lazily awards any newly-earned badges (+ XP).
import { NextResponse } from "next/server";
import { evaluateBadges } from "@/lib/studio/badges";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
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
