import { NextRequest, NextResponse } from "next/server";
import { runDawnPatrol } from "@/lib/ski/dawn-patrol";

export const runtime = "nodejs";
/** One Open-Meteo fetch per followed resort across all followers; give it room. */
export const maxDuration = 300;

/**
 * Vercel Cron (daily 12:00 UTC ≈ dawn for US resorts): dawn-patrol snow
 * alerts to Powder Pass members who follow resorts (lib/ski/dawn-patrol).
 * Auth is the house cron pattern: CRON_SECRET as a Bearer token (Vercel
 * sends it automatically); when the secret is unset the route still
 * runs, exactly like the camera-alerts cron. ?dryRun=1 computes the
 * full run and counts would-send emails without sending or logging
 * (still CRON_SECRET-gated).
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
  const summary = await runDawnPatrol({ dryRun });
  return NextResponse.json({ ok: true, ...summary });
}
