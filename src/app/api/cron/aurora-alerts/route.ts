import { NextRequest, NextResponse } from "next/server";
import { runAuroraAlerts } from "@/lib/aurora/runner";

export const runtime = "nodejs";
/** NOAA fetch + a send pass over subscriptions; the house maxDuration for mail runs. */
export const maxDuration = 300;

/**
 * Vercel Cron: the aurora alert sender — for each active subscription,
 * if NOAA's forecast Kp for the place's local night reaches the level
 * its geomagnetic latitude needs, send ONE email for that night (the
 * claim on AuroraAlertSubscription.lastAlertNight makes re-runs
 * no-ops). Auth is the house cron pattern: CRON_SECRET as a Bearer
 * token (Vercel sends it automatically); when the secret is unset the
 * route still runs, exactly like the lifecycle-emails cron.
 *
 * ?dryRun=1 evaluates everything and sends nothing (still behind
 * CRON_SECRET — the summary can reveal subscriber counts).
 *
 * SCHEDULING IS NOT WIRED BY THIS ROUTE ALONE: it needs a vercel.json
 * crons entry — proposed in the build report for the ship step.
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
  const summary = await runAuroraAlerts({ dryRun });
  return NextResponse.json({ ok: summary.errors.length === 0, ...summary });
}
