import { NextRequest, NextResponse } from "next/server";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { transferOrganization } from "@/lib/team/transfer";

export const runtime = "nodejs";

/**
 * POST /api/team/organization/transfer { orgId, newOwnerUserId, confirm }
 * Owner only; confirm must be exactly "TRANSFER". Moves the seat item
 * between the two owners' Stripe subscriptions (abort-safe with
 * rollback), then swaps ownership + roles in a DB transaction.
 * See src/lib/team/transfer.ts for the full choreography.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      orgId?: string;
      newOwnerUserId?: string;
      confirm?: string;
    };
    const result = await transferOrganization({
      orgId: String(body.orgId ?? ""),
      callerId: userId,
      newOwnerUserId: String(body.newOwnerUserId ?? ""),
      confirm: body.confirm,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
