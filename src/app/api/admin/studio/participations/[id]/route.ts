// Admin: spot-check review of a campaign participation.
// POST { reviewStatus: "verified" | "flagged" | "none" }
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

const REVIEW_STATUSES = ["verified", "flagged", "none"] as const;

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const actor = session?.user?.id;

  const body = (await req.json().catch(() => ({}))) as { reviewStatus?: unknown };
  if (
    typeof body.reviewStatus !== "string" ||
    !(REVIEW_STATUSES as readonly string[]).includes(body.reviewStatus)
  ) {
    return NextResponse.json(
      { error: `reviewStatus must be one of ${REVIEW_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const existing = await db.studioCampaignParticipation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Participation not found" }, { status: 404 });

  const participation = await db.studioCampaignParticipation.update({
    where: { id },
    data: { reviewStatus: body.reviewStatus },
  });

  await audit("studio.participation.review", {
    actorUserId: actor, targetType: "StudioCampaignParticipation", targetId: id,
    details: {
      reviewStatus: body.reviewStatus,
      campaignId: existing.campaignId,
      profileId: existing.profileId,
    },
  });
  return NextResponse.json({ participation });
}
