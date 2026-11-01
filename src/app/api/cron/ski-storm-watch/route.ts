import { NextRequest, NextResponse } from "next/server";
import { runStormWatch } from "@/lib/ski/storm-watch";

export const runtime = "nodejs";
/** One Open-Meteo fetch per followed resort across all followers; give it room. */
export const maxDuration = 300;

/**
 * Vercel Cron (daily 14:00 UTC): storm-watch emails to Powder Pass
 * members who follow resorts (lib/ski/storm-watch) — a followed
 * resort with ≥30 cm in its next-3-days modelled forecast gets one
 * email per user per storm. Auth is the house cron pattern:
 * CRON_SECRET as a Bearer <redacted>; ?dryRun=1 computes without sending.
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
  const summary = await runStormWatch({ dryRun });
  return NextResponse.json({ ok: true, ...summary });
}
