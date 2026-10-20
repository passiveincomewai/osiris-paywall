import { NextResponse } from "next/server";
import { BASE_CENTS } from "@/lib/team/pricing";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";

export const runtime = "nodejs";

/** GET /api/team/pricing — public config for the pricing calculators. */
export async function GET() {
  const config = await getTeamPricingConfig();
  return NextResponse.json({
    maxSeats: config.maxSeats,
    tiers: config.tiers,
    baseCents: BASE_CENTS,
    inviteExpiryDays: config.inviteExpiryDays,
  });
}
