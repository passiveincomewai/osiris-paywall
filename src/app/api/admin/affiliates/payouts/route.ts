// Admin: payout review — list requests, approve / reject / mark paid.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";
function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET(req: Request) {
  try { await requireAdmin(); } catch (e) { return forbidden(e); }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const rows = await db.payout.findMany({
    where: status ? { status: status as "requested" } : {},
    include: { affiliate: { include: { user: { select: { email: true, name: true } } } } },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    payouts: rows.map((p) => ({
      id: p.id, amountCents: p.amountCents, currency: p.currency, method: p.method,
      status: p.status, providerRef: p.providerRef, note: p.note,
      requestedAt: p.requestedAt, decidedAt: p.decidedAt,
      affiliate: { id: p.affiliate.id, email: p.affiliate.user.email, name: p.affiliate.user.name, payoutEmail: p.affiliate.payoutEmail },
    })),
  });
}

export async function POST(req: Request) {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const { payoutId, action, providerRef, note } = (await req.json().catch(() => ({}))) as {
    payoutId?: string; action?: "approve" | "reject" | "mark_paid"; providerRef?: string; note?: string;
  };
  const payout = await db.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    if (payout.status !== "requested") return NextResponse.json({ error: "Bad state" }, { status: 400 });
    await db.payout.update({ where: { id: payout.id }, data: { status: "approved", decidedAt: new Date(), decidedBy: session?.user?.email ?? undefined, note } });
    // NOTE: actual money movement happens in the payout provider (Stripe
    // Connect / PayPal Payouts) or manually, then mark_paid with the reference.
  } else if (action === "reject") {
    if (payout.status !== "requested") return NextResponse.json({ error: "Bad state" }, { status: 400 });
    await db.$transaction([
      db.payout.update({ where: { id: payout.id }, data: { status: "rejected", decidedAt: new Date(), decidedBy: session?.user?.email ?? undefined, note } }),
      // Return the commissions to available so they can be requested again.
      db.commission.updateMany({ where: { payoutId: payout.id, status: "requested" }, data: { status: "available", payoutId: null } }),
    ]);
  } else if (action === "mark_paid") {
    if (!["approved", "processing"].includes(payout.status)) return NextResponse.json({ error: "Approve first" }, { status: 400 });
    await db.$transaction([
      db.payout.update({ where: { id: payout.id }, data: { status: "paid", decidedAt: new Date(), decidedBy: session?.user?.email ?? undefined, providerRef, note } }),
      db.commission.updateMany({ where: { payoutId: payout.id }, data: { status: "paid" } }),
    ]);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await audit(`payout.${action}`, {
    actorUserId: session?.user?.id, targetType: "Payout", targetId: payout.id, details: { providerRef, note },
  });
  return NextResponse.json({ ok: true });
}
