import { NextRequest, NextResponse } from "next/server";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { listTransferCandidates } from "@/lib/team/transfer";

export const runtime = "nodejs";

/**
 * GET /api/team/organization/transfer-candidates?orgId=
 * Current owner only. Members (excluding the owner) with server-side
 * transfer eligibility and a plain-words reason when ineligible.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    const candidates = await listTransferCandidates(orgId, userId);
    return NextResponse.json(candidates);
  } catch (err) {
    return teamErrorResponse(err);
  }
}
