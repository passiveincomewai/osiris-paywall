import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { TeamError } from "@/lib/team/permissions";
import { BASE_CENTS, seatCostCents } from "@/lib/team/pricing";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { cycleForPriceId } from "@/lib/team/seats";

export const runtime = "nodejs";

/** GET /api/team/billing?orgId= — owner only: invoices + upcoming totals. */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new TeamError(404, "Team not found");
    if (org.ownerId !== userId) throw new TeamError(403, "Only the team owner can view billing");
    const sub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
    if (!sub) throw new TeamError(400, "The team owner has no subscription");

    const s = stripe();
    const config = await getTeamPricingConfig();
    const cycle = cycleForPriceId(sub.stripePriceId);
    const effectiveSeats = org.pendingSeats ?? org.purchasedSeats;
    const seatCost = seatCostCents(config.tiers[cycle], effectiveSeats);

    let invoices: Array<{
      id: string; number: string | null; status: string | null;
      amountPaidCents: number; totalCents: number; created: number;
      hostedInvoiceUrl: string | null; invoicePdf: string | null;
    }> = [];
    try {
      const list = await s.invoices.list({ customer: sub.stripeCustomerId, limit: 12 });
      invoices = list.data.map((inv) => ({
        id: inv.id ?? "",
        number: inv.number ?? null,
        status: inv.status ?? null,
        amountPaidCents: inv.amount_paid ?? 0,
        totalCents: inv.total ?? 0,
        created: inv.created ?? 0,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
      }));
    } catch (err) {
      console.error("[team-billing] invoice list failed:", err);
    }

    let paymentMethodHint: string | null = null;
    try {
      const methods = await s.paymentMethods.list({ customer: sub.stripeCustomerId, type: "card", limit: 1 });
      const card = methods.data[0]?.card;
      if (card) paymentMethodHint = `${card.brand ?? "card"} •••• ${card.last4 ?? ""}`.trim();
    } catch {
      paymentMethodHint = null;
    }

    return NextResponse.json({
      invoices,
      upcoming: {
        totalCents: BASE_CENTS[cycle] + seatCost,
        seatCostCents: seatCost,
        baseCents: BASE_CENTS[cycle],
        periodEnd: sub.currentPeriodEnd.toISOString(),
      },
      paymentMethodHint,
    });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
