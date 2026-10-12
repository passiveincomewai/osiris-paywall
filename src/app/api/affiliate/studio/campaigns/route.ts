// GET /api/affiliate/studio/campaigns — active campaigns (+ recently
// ended ones the caller joined), each with myParticipation + trackedLink.
import { NextResponse } from "next/server";
import { listCampaignsForAffiliate } from "@/lib/studio/campaigns";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const campaigns = await listCampaignsForAffiliate(profile.id);
  return NextResponse.json({ campaigns });
}
