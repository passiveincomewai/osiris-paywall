// POST /api/affiliate/studio/drops/claim — claim today's drop; the XP
// bonus pays exactly once per affiliate per drop.
import { NextResponse } from "next/server";
import { claimDrop } from "@/lib/studio/drops";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

export async function POST() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const result = await claimDrop(profile.id);
  return NextResponse.json(result);
}
