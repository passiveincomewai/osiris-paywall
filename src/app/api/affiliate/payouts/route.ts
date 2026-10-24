// GET/POST /api/affiliate/payouts — request a payout from available balance.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { releaseMaturedCommissions } from "@/lib/affiliate/commissions";
import { audit } from "@/lib/affiliate/admin";
import { requireAffiliate, activeOnly } from "../_util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { profile, error, userId } = await requireAffiliate();
  if (error) return error;
  const blocked = activeOnly(profile);
  if (blocked) return blocked;

  const settings = await getSettings();
  await releaseMaturedCommissions().catch(() => {});

  const available = await db.commission.findMany({
    where: { affiliateProfileId: profile.id, status: "available" },
    select: { id: true, amountCents: true },
  });
  const total = available.reduce((a, c) => a + c.amountCents, 0);
  // A personal threshold (set in the dashboard) raises — never lowers —
  // the program minimum the balance must clear.
  const effectiveMin = Math.max(settings.minPayoutCents, profile.payoutThresholdCents ?? 0);
  if (total < effectiveMin) {
    return NextResponse.json(
      {
        error: profile.payoutThresholdCents && profile.payoutThresholdCents > settings.minPayoutCents
          ? `Your personal payout threshold is $${(effectiveMin / 100).toFixed(2)} — your available balance hasn't reached it yet.`
          : `Minimum payout is $${(settings.minPayoutCents / 100).toFixed(2)}`,
        availableCents: total,
      },
      { status: 400 },
    );
  }

  const { payoutEmail, payoutMethod } = (await req.json().catch(() => ({}))) as {
    payoutEmail?: string; payoutMethod?: string;
  };
  if (payoutEmail) {
    await db.affiliateProfile.update({ where: { id: profile.id }, data: { payoutEmail, payoutMethod: payoutMethod ?? "manual" } });
  }

  const payout = await db.payout.create({
    data: {
      affiliateProfileId: profile.id,
      amountCents: total,
      method: payoutMethod ?? profile.payoutMethod ?? "manual",
      status: "requested",
    },
  });
  await db.commission.updateMany({
    where: { id: { in: available.map((c) => c.id) } },
    data: { status: "requested", payoutId: payout.id },
  });
  await audit("payout.requested", {
    actorUserId: userId, targetType: "Payout", targetId: payout.id,
    details: { amountCents: total, count: available.length },
  });

  return NextResponse.json({ payout: { id: payout.id, amountCents: total, status: payout.status } });
}
