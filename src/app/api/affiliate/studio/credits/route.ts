// GET /api/affiliate/studio/credits — the caller's Studio credit balance
// for the current month, plus the public pricing config (credit value,
// per-action prices, monthly allowance). Reading the balance first
// grants the monthly allowance (the studio gate already proved
// membership), so a member opening the Studio sees this month's credits.
import { NextResponse } from "next/server";
import { ensureMonthlyAllowance } from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const config = await getCreditConfig();
  const { balance } = await ensureMonthlyAllowance(profile.id, true, config);

  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  return NextResponse.json({
    balance,
    monthKey,
    config: {
      creditUsd: config.creditUsd,
      prices: config.prices,
      monthlyAllowance: config.monthlyAllowance,
    },
  });
}
