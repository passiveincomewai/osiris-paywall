// GET /api/affiliate/studio/credits — the caller's Studio credit balance
// for the current month, plus the public pricing config (credit value,
// per-action prices, monthly allowance). Reading the balance first
// grants the monthly allowance (the studio gate already proved
// membership), so a member opening the Studio sees this month's credits.
//
// Phase 3: also returns the activity ledger, the member-allowance status,
// the caller's AI usage vs the monthly budget/caps, and the credit packs
// with a per-pack `configured` flag (true only when the owner has set
// the pack's Stripe price id in the environment — unconfigured packs are
// displayed as unavailable, never as dead buy buttons).
import { NextResponse } from "next/server";
import {
  allowanceGrantedThisMonth,
  ensureMonthlyAllowance,
  getCreditActivity,
  monthKeyOf,
} from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import { getAiMonthUsage } from "@/lib/studio/ai";
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
  const [activity, allowanceGranted, aiUsage] = await Promise.all([
    getCreditActivity(profile.id, 30),
    allowanceGrantedThisMonth(profile.id, now),
    getAiMonthUsage(profile.id, now),
  ]);

  return NextResponse.json({
    balance,
    monthKey: monthKeyOf(now),
    config: {
      creditUsd: config.creditUsd,
      prices: config.prices,
      monthlyAllowance: config.monthlyAllowance,
      monthlyAiBudgetUsd: config.monthlyAiBudgetUsd,
      aiUserMonthlyCapCredits: config.aiUserMonthlyCapCredits,
    },
    allowance: {
      amount: config.monthlyAllowance,
      grantedThisMonth: allowanceGranted,
    },
    ai: {
      monthCredits: aiUsage.userCredits,
      userCapCredits: config.aiUserMonthlyCapCredits,
      globalMonthCredits: aiUsage.globalCredits,
      budgetUsd: config.monthlyAiBudgetUsd,
    },
    packs: config.creditPacks.map((p) => ({
      id: p.id,
      name: p.name,
      credits: p.credits,
      priceUsd: p.priceUsd,
      blurb: p.blurb,
      configured: !!process.env[p.priceEnv],
    })),
    activity: activity.map((row) => ({
      id: row.id,
      delta: row.delta,
      reason: row.reason,
      jobId: row.jobId,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
