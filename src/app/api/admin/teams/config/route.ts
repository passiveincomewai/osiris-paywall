import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";
import { stripe } from "@/lib/stripe";
import { validateTierTable, CYCLES, type Cycle, type TierBand } from "@/lib/team/pricing";
import { getTeamPricingConfig, SEAT_PRODUCT_ID } from "@/lib/team/pricing-config";

export const runtime = "nodejs";

const INTERVAL_FOR_CYCLE: Record<Cycle, "week" | "month" | "year"> = {
  weekly: "week",
  monthly: "month",
  annual: "year",
};

function tiersEqual(a: TierBand[], b: TierBand[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * PUT /api/admin/teams/config { maxSeats?, inviteExpiryDays?, tiers? }
 * When a cycle's tiers change, a NEW graduated Stripe price is created
 * for that cycle and stored in the config; existing seat items keep
 * their current Stripe price — changes apply to new purchases only.
 */
export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    maxSeats?: number;
    inviteExpiryDays?: number;
    tiers?: Record<string, unknown>;
  };
  const current = await getTeamPricingConfig();

  const maxSeats = body.maxSeats !== undefined ? Number(body.maxSeats) : current.maxSeats;
  const inviteExpiryDays =
    body.inviteExpiryDays !== undefined ? Number(body.inviteExpiryDays) : current.inviteExpiryDays;
  if (!Number.isInteger(maxSeats) || maxSeats < 0 || maxSeats > 10000) {
    return NextResponse.json({ ok: false, error: "Invalid maxSeats" }, { status: 400 });
  }
  if (!Number.isInteger(inviteExpiryDays) || inviteExpiryDays < 1 || inviteExpiryDays > 90) {
    return NextResponse.json({ ok: false, error: "Invalid inviteExpiryDays" }, { status: 400 });
  }

  const tiers = { ...current.tiers };
  const seatPriceIds = { ...current.seatPriceIds };
  const rotatedCycles: Cycle[] = [];

  if (body.tiers !== undefined) {
    if (!body.tiers || typeof body.tiers !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid tiers" }, { status: 400 });
    }
    for (const cycle of CYCLES) {
      const candidate = (body.tiers as Record<string, unknown>)[cycle];
      if (candidate === undefined) continue;
      if (!validateTierTable(candidate)) {
        return NextResponse.json({ ok: false, error: `Invalid tier table for ${cycle}` }, { status: 400 });
      }
      if (!tiersEqual(candidate, current.tiers[cycle])) {
        tiers[cycle] = candidate;
        rotatedCycles.push(cycle);
      }
    }
  }

  // Create new Stripe prices BEFORE persisting, so a Stripe failure
  // leaves the stored config untouched.
  for (const cycle of rotatedCycles) {
    const price = await stripe().prices.create({
      product: SEAT_PRODUCT_ID,
      currency: "usd",
      billing_scheme: "tiered",
      tiers_mode: "graduated",
      tiers: tiers[cycle].map((band) => ({
        up_to: band.upTo ?? ("inf" as const),
        unit_amount: band.unitCents,
      })),
      recurring: { interval: INTERVAL_FOR_CYCLE[cycle] },
    });
    seatPriceIds[cycle] = price.id;
  }

  const saved = await db.teamPricingConfig.upsert({
    where: { id: "default" },
    create: { id: "default", maxSeats, inviteExpiryDays, tiers: tiers as object, seatPriceIds: seatPriceIds as object },
    update: { maxSeats, inviteExpiryDays, tiers: tiers as object, seatPriceIds: seatPriceIds as object },
  });
  void session;
  return NextResponse.json({
    ok: true,
    config: { maxSeats: saved.maxSeats, inviteExpiryDays: saved.inviteExpiryDays, tiers, seatPriceIds },
    rotatedCycles,
    note: "Pricing changes apply to new seat purchases only; existing seat items keep their current Stripe price.",
  });
}
