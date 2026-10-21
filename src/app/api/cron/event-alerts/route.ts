import { NextRequest, NextResponse } from "next/server";
import { runEventAlertChecks } from "@/lib/vip/events/checker";

export const runtime = "nodejs";
/** ISS pass computation over many rules is CPU work; give it room. */
export const maxDuration = 300;

/**
 * Vercel Cron (every 15 min): evaluate VIP event-alert rules (quakes,
 * launches, ISS passes) and notify on new matches. Auth is the house
 * cron pattern: CRON_SECRET as a Bearer token (Vercel sends it
 * automatically); when the secret is unset the route still runs,
 * exactly like the camera-alerts cron.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const summary = await runEventAlertChecks();
  return NextResponse.json({ ok: true, ...summary });
}
