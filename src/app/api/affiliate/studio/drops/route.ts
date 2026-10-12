// GET /api/affiliate/studio/drops — today's (UTC) Daily Content Drop
// and whether the caller has already claimed it.
import { NextResponse } from "next/server";
import { getTodayDrop, hasClaimedDrop } from "@/lib/studio/drops";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const drop = await getTodayDrop();
  const claimed = drop ? await hasClaimedDrop(profile.id, drop.id) : false;
  return NextResponse.json({ drop, claimed });
}
