// Admin: review a creator free-Pro application.
// POST { decision: "approve" | "reject" }
// Approve → application approved + comp Pro granted (12 months, "creator").
// Reject  → application rejected, no grant. Both stamp reviewedAt.
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { grantCompPro } from "@/lib/pro/comp";
import { CREATOR_PRO_MONTHS } from "@/lib/pro/creator";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const { decision } = (await req.json().catch(() => ({}))) as { decision?: string };
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be \"approve\" or \"reject\"" }, { status: 400 });
  }

  const app = await db.creatorApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.status !== "pending") {
    return NextResponse.json({ error: `Application already ${app.status}` }, { status: 409 });
  }

  const now = new Date();
  if (decision === "reject") {
    const updated = await db.creatorApplication.update({
      where: { id },
      data: { status: "rejected", reviewedAt: now },
    });
    await audit("creator.reject", {
      actorUserId: session?.user?.id, targetType: "CreatorApplication", targetId: id,
      details: { handle: app.handle, platform: app.platform },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  // Approve: mark first, then grant. If the user already pays for Pro the
  // grant safely no-ops (paid sub wins) and the approval still stands —
  // their comp simply isn't needed.
  const updated = await db.creatorApplication.update({
    where: { id },
    data: { status: "approved", reviewedAt: now },
  });
  const grant = await grantCompPro(app.userId, "creator", CREATOR_PRO_MONTHS);
  await audit("creator.approve", {
    actorUserId: session?.user?.id, targetType: "CreatorApplication", targetId: id,
    details: { handle: app.handle, platform: app.platform, followers: app.followers, grant },
  });
  return NextResponse.json({ id: updated.id, status: updated.status, grant });
}
