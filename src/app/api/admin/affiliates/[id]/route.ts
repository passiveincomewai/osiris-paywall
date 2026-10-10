// Admin: single-affiliate actions (status, XP adjust).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { awardXP } from "@/lib/affiliate/xp";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!["pending", "active", "suspended", "banned"].includes(status ?? "")) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const updated = await db.affiliateProfile.update({
    where: { id },
    data: { status: status as "pending" | "active" | "suspended" | "banned" },
  });
  await audit("affiliate.status", {
    actorUserId: session?.user?.id, targetType: "AffiliateProfile", targetId: id, details: { status },
  });
  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const { xp, reason } = (await req.json().catch(() => ({}))) as { xp?: number; reason?: string };
  if (typeof xp !== "number" || !Number.isFinite(xp) || Math.abs(xp) > 10000) {
    return NextResponse.json({ error: "xp must be a finite number within ±10000" }, { status: 400 });
  }
  const key = `admin:${Date.now()}:${id}:${xp}`;
  if (xp >= 0) {
    await awardXP(id, "admin_award", { xp, idempotencyKey: key, meta: { reason, by: session?.user?.email } });
  } else {
    // Revoke: negative XPEvent + decrement (ledger stays auditable).
    await db.xPEvent.create({
      data: { affiliateProfileId: id, activity: "admin_revoke", xp, idempotencyKey: key, meta: { reason, by: session?.user?.email } as object },
    });
    await db.affiliateProfile.update({ where: { id }, data: { xp: { increment: xp } } });
  }
  const p = await db.affiliateProfile.findUnique({ where: { id }, select: { xp: true } });
  await audit("affiliate.xp_adjust", {
    actorUserId: session?.user?.id, targetType: "AffiliateProfile", targetId: id, details: { xp, reason },
  });
  return NextResponse.json({ id, xp: p?.xp ?? 0 });
}
