// Admin: payout review queue — list payouts (48-hour processing window),
// approve / reject / start processing / mark paid / resend status email.
// State changes + affiliate status emails live in src/lib/affiliate/payouts.ts.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { transitionPayout, PAYOUT_SLA_MS, type PayoutAction } from "@/lib/affiliate/payouts";

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
      // 48-hour processing window, counted from the request.
      deadlineAt: new Date(p.requestedAt.getTime() + PAYOUT_SLA_MS),
      lastEmailedStatus: p.lastEmailedStatus,
      affiliate: {
        id: p.affiliate.id, email: p.affiliate.user.email, name: p.affiliate.user.name,
        payoutEmail: p.affiliate.payoutEmail, venmoHandle: p.affiliate.venmoHandle,
      },
    })),
  });
}

const ACTIONS: PayoutAction[] = ["approve", "reject", "start_processing", "mark_paid", "resend_email"];

export async function POST(req: Request) {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const { payoutId, action, providerRef, note } = (await req.json().catch(() => ({}))) as {
    payoutId?: string; action?: string; providerRef?: string; note?: string;
  };
  if (!payoutId || !action || !ACTIONS.includes(action as PayoutAction)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  // NOTE: actual money movement happens outside the app (Venmo, Stripe
  // Connect, or a manual arrangement), then mark_paid with the reference.
  const result = await transitionPayout(payoutId, action as PayoutAction, {
    decidedBy: session?.user?.email ?? undefined, providerRef, note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.httpStatus });

  await audit(`payout.${action}`, {
    actorUserId: session?.user?.id, targetType: "Payout", targetId: payoutId,
    details: { providerRef, note, emailed: result.emailed },
  });
  return NextResponse.json({ ok: true, status: result.status, emailed: result.emailed });
}
