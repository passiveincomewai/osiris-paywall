// POST /api/affiliate/studio/campaigns/[id]/join — join an active
// campaign (idempotent upsert). Rule failures → 400, unknown campaign → 404.
import { NextResponse } from "next/server";
import { joinCampaign } from "@/lib/studio/campaigns";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  try {
    const participation = await joinCampaign(profile.id, id);
    return NextResponse.json({ participation });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 400;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not join campaign" },
      { status },
    );
  }
}
