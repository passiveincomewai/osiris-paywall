import { NextRequest, NextResponse } from "next/server";
import { runLifecycleEmails } from "@/lib/lifecycle/engine";

export const runtime = "nodejs";

/**
 * Vercel Cron (every 6h): the lifecycle email engine — welcome +
 * discount, interest-matched follow-ups, pricing/checkout retargeting,
 * trial started / trial win-back, affiliate signup + first-commission
 * notifications. All selection logic lives in src/lib/lifecycle
 * (triggers/guards are pure and unit-tested); sends are logged in
 * LifecycleEmailLog, which is what makes every trigger once-only.
 *
 * ?dryRun=1 renders everything due and sends nothing (still behind
 * CRON_SECRET — the renders contain real user emails).
 * Campaign blasts are NOT sent here — they are prepared drafts that go
 * out only through the owner-approved command (lib/lifecycle/campaigns).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const summary = await runLifecycleEmails({ dryRun });
  return NextResponse.json({
    ok: summary.errors.length === 0,
    dryRun: summary.dryRun,
    evaluated: summary.evaluated,
    sent: summary.sent,
    skipped: summary.skipped,
    errors: summary.errors,
  });
}
