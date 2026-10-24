// GET /api/affiliate/export?type=clicks|commissions|payouts — CSV
// download of the affiliate's own ledger rows. Real data only; the
// affiliate sees exactly the rows the dashboard aggregates.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/affiliate/insights";
import { requireAffiliate } from "../_util";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const type = new URL(req.url).searchParams.get("type") ?? "commissions";
  const pid = profile.id;

  let csv: string;
  if (type === "clicks") {
    const rows = await db.referralClick.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: { trackingLink: { select: { label: true, slug: true } } },
    });
    csv = toCsv(
      ["date", "path", "tracking_link", "referrer", "utm_source", "utm_medium", "utm_campaign", "user_agent"],
      rows.map((r) => [
        r.createdAt.toISOString(), r.path ?? "", r.trackingLink ? `${r.trackingLink.label} (${r.trackingLink.slug})` : "",
        r.referrer ?? "", r.utmSource ?? "", r.utmMedium ?? "", r.utmCampaign ?? "", r.userAgent ?? "",
      ]),
    );
  } else if (type === "payouts") {
    const rows = await db.payout.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { requestedAt: "desc" },
      take: 1000,
    });
    csv = toCsv(
      ["requested_at", "amount_usd", "status", "method", "decided_at", "note"],
      rows.map((r) => [
        r.requestedAt.toISOString(), (r.amountCents / 100).toFixed(2), r.status, r.method,
        r.decidedAt?.toISOString() ?? "", r.note ?? "",
      ]),
    );
  } else {
    const rows = await db.commission.findMany({
      where: { affiliateProfileId: pid },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
    csv = toCsv(
      ["date", "level", "amount_usd", "currency", "status", "available_at", "stripe_invoice_id"],
      rows.map((r) => [
        r.createdAt.toISOString(), `L${r.level}`, (r.amountCents / 100).toFixed(2), r.currency,
        r.status, r.availableAt.toISOString(), r.stripeInvoiceId ?? "",
      ]),
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="worldeye-affiliate-${type}.csv"`,
    },
  });
}
