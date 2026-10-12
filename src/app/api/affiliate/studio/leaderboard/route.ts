// GET /api/affiliate/studio/leaderboard — current-month Studio leaderboard
// (published top 25, opt-outs excluded) plus the caller's own entry when
// they fall outside the published list.
import { NextResponse } from "next/server";
import { getOwnLeaderboardEntry, getStudioLeaderboard } from "@/lib/studio/analytics";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const { month, entries } = await getStudioLeaderboard();
  const own = entries.find((e) => e.profileId === profile.id) ?? null;
  const me = own ?? (await getOwnLeaderboardEntry(profile.id));
  return NextResponse.json({ month, entries, me });
}
