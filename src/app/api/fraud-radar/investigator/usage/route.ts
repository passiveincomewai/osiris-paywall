import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarTierOf } from "@/lib/fraud-radar/investigator/entitlements";
import { investigatorSession } from "@/lib/fraud-radar/investigator/route-helpers";
import { getInvestigatorStore } from "@/lib/fraud-radar/investigator/store";
import { getUsageSummary } from "@/lib/fraud-radar/investigator/usage";

/**
 * Fraud Radar Phase 7 — the caller's investigator usage
 * (PHASE7 §4.2, §4.4): tier, ops used / limit this calendar
 * month (UTC, counted from the ledger — the source of truth),
 * and the reset date.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!fraudRadarEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await investigatorSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to use the investigator.", code: "SIGN_IN_REQUIRED" },
      { status: 401 },
    );
  }
  const tier = fraudRadarTierOf(session.session);
  if (tier === "none") {
    return NextResponse.json(
      { error: "The investigator is not included in your plan.", code: "FR_AI_TIER_REQUIRED" },
      { status: 403 },
    );
  }
  const summary = await getUsageSummary(
    getInvestigatorStore(),
    session.userId,
    tier,
  );
  return NextResponse.json(summary);
}
