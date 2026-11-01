import { NextRequest, NextResponse } from "next/server";
import { runAffiliateMonthlySummary } from "@/lib/affiliate/monthly-summary";

export const runtime = "nodejs";

/**
 * Affiliate-summary cron (monthly, 1st 15:00 UTC): one statement
 * email per affiliate with any activity in the previous calendar
 * month. CRON_SECRET Bearer <redacted> — same house pattern as the
 * other crons.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  try {
    const result = await runAffiliateMonthlySummary(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/affiliate-summary] failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
