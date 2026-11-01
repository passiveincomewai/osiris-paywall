import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { resolveFraudRadarEntitlement } from "@/lib/fraud-radar/billing/tier";
import { getDefaultUsageStore, usageSummary } from "@/lib/fraud-radar/billing/usage";
import { FRAUD_RADAR_TRIAL_DAYS, FR_PLAN_DEFS } from "@/lib/fraud-radar/billing/plans";

/**
 * Fraud Radar Phase 11 — billing state read (PHASE11 §2.4 GET,
 * SHV-11 P11-B). Flag (404) → session (401) → state. This is a
 * READ only: checkout/portal are P11-D, deferred by design, and
 * no Stripe object exists yet (P11-H, owner's step) — plans are
 * reported as data with stripeObjectCreated: false, never with
 * invented price IDs.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!fraudRadarEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }
  const ent = await resolveFraudRadarEntitlement(userId);
  let usage = null;
  try {
    usage = await usageSummary(await getDefaultUsageStore(), ent, userId);
  } catch { usage = null; }
  return NextResponse.json({
    tier: ent.tier,
    source: ent.source,
    subscriptionId: ent.subscriptionId,
    periodEnd: ent.periodEnd?.toISOString() ?? null,
    seats: ent.seats,
    trialDays: FRAUD_RADAR_TRIAL_DAYS,
    checkoutAvailable: false,
    plans: FR_PLAN_DEFS.map((d) => ({
      key: d.key, interval: d.interval, displayName: d.displayName,
      displayPrice: d.displayPrice, seatsIncluded: d.seatsIncluded,
      stripeObjectCreated: d.stripeObjectCreated,
    })),
    usage,
  });
}
