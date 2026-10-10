// Admin: commissions ledger, settings, fraud signals, audit log, overview.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";
import { getSettings, saveSettings } from "@/lib/affiliate/settings";
import { fraudScan } from "@/lib/affiliate/admin";

export const runtime = "nodejs";
function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET(req: Request) {
  try { await requireAdmin(); } catch (e) { return forbidden(e); }
  const { pathname, searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "overview";

  if (view === "commissions") {
    const rows = await db.commission.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      include: { affiliate: { include: { user: { select: { email: true } } } } },
    });
    return NextResponse.json({
      commissions: rows.map((c) => ({
        id: c.id, affiliateEmail: c.affiliate.user.email, level: c.level,
        amountCents: c.amountCents, status: c.status, stripeInvoiceId: c.stripeInvoiceId,
        availableAt: c.availableAt, createdAt: c.createdAt,
      })),
    });
  }

  if (view === "fraud") {
    return NextResponse.json({ signals: await fraudScan() });
  }

  if (view === "audit") {
    const rows = await db.affiliateAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ audit: rows });
  }

  // overview: program economics
  const [affCount, activeCount, commAgg, payoutAgg, pendingPayouts] = await Promise.all([
    db.affiliateProfile.count(),
    db.affiliateProfile.count({ where: { status: "active" } }),
    db.commission.aggregate({ where: { status: { not: "reversed" } }, _sum: { amountCents: true } }),
    db.payout.aggregate({ where: { status: "paid" }, _sum: { amountCents: true } }),
    db.payout.aggregate({ where: { status: "requested" }, _sum: { amountCents: true } }),
  ]);
  return NextResponse.json({
    affiliates: affCount,
    activeAffiliates: activeCount,
    commissionLiabilityCents: (commAgg._sum.amountCents ?? 0) - (payoutAgg._sum.amountCents ?? 0),
    paidOutCents: payoutAgg._sum.amountCents ?? 0,
    pendingPayoutCents: pendingPayouts._sum.amountCents ?? 0,
    settings: await getSettings(),
  });
}

export async function PUT(req: Request) {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const { pathname } = new URL(req.url);
  void pathname;
  const patch = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Only allow known keys through.
  const allowed = ["ranks", "overrideL2Pct", "overrideL3Pct", "attributionWindowDays", "holdingPeriodDays", "minPayoutCents", "xpTable"] as const;
  const clean: Record<string, unknown> = {};
  for (const k of allowed) if (k in patch) clean[k] = patch[k];
  const saved = await saveSettings(clean, session?.user?.id);
  return NextResponse.json({ settings: saved });
}
