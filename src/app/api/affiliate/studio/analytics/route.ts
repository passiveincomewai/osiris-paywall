// GET /api/affiliate/studio/analytics — the caller's Studio analytics.
import { NextResponse } from "next/server";
import { getAffiliateStudioAnalytics } from "@/lib/studio/analytics";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const analytics = await getAffiliateStudioAnalytics(profile.id);
  return NextResponse.json(analytics);
}
