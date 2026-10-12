// POST /api/affiliate/studio/campaigns/[id]/complete — body { postUrl }.
// Completing pays the campaign's XP + credit rewards exactly once;
// replays return alreadyCompleted:true with zero awards.
import { NextResponse } from "next/server";
import { completeCampaign } from "@/lib/studio/campaigns";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { postUrl?: unknown };
  try {
    const result = await completeCampaign(profile.id, id, body.postUrl);
    return NextResponse.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 400;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not complete campaign" },
      { status },
    );
  }
}
