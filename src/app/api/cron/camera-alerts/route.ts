import { NextRequest, NextResponse } from "next/server";
import { runAlertChecks } from "@/lib/camera-alerts/checker";

export const runtime = "nodejs";
/** A full run is frames + vision calls; give it room (same as trial-reminders' needs, stated). */
export const maxDuration = 300;

/**
 * Vercel Cron (every 15 min): check camera-alert rules (Pro + VIP Pro
 * owners) against the cameras' latest stills and notify on a
 * clear→match change. Auth is
 * the house cron pattern: CRON_SECRET as a Bearer token (Vercel sends
 * it automatically); when the secret is unset the route still runs,
 * exactly like the trial-reminders cron.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const summary = await runAlertChecks();
  return NextResponse.json({ ok: true, ...summary });
}
